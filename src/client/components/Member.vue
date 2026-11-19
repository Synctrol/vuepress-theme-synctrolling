<script setup lang="ts">
import { Comment, Fragment, Text, computed, useSlots } from 'vue'
import type { VNode, VNodeChild } from 'vue'
import { resolveContentAsset } from '../assets/resolve-content-asset.js'
import Social from './Social.vue'

defineOptions({ name: 'Member' })

const props = defineProps<{
  name: string
  avatar: string
}>()

const slots = useSlots()

function isSocialVNode(vnode: VNode): boolean {
  const type = vnode.type
  if (type === Social) return true
  if (typeof type === 'object' && type !== null && 'name' in type) {
    return (type as { name?: string }).name === 'Social'
  }
  if (typeof type === 'object' && type !== null && '__name' in type) {
    return (type as { __name?: string }).__name === 'Social'
  }
  return false
}

function flattenNodes(children: VNodeChild[] | undefined): VNode[] {
  const result: VNode[] = []
  for (const child of children ?? []) {
    if (child === null || child === undefined || typeof child === 'boolean') {
      continue
    }
    if (typeof child === 'string' || typeof child === 'number') {
      result.push(h(Text, null, String(child)))
      continue
    }
    if (!Array.isArray(child) && typeof child === 'object' && 'type' in child) {
      const vnode = child as VNode
      if (vnode.type === Fragment && Array.isArray(vnode.children)) {
        result.push(...flattenNodes(vnode.children as VNodeChild[]))
        continue
      }
      if (vnode.type === Comment) continue
      result.push(vnode)
    }
  }
  return result
}

function isWhitespaceText(vnode: VNode): boolean {
  return (
    vnode.type === Text &&
    String(vnode.children ?? '')
      .trim()
      .length === 0
  )
}

const partitioned = computed(() => {
  const nodes = flattenNodes(slots.default?.() as VNodeChild[] | undefined)
  const bio: VNode[] = []
  const social: VNode[] = []
  for (const node of nodes) {
    if (isSocialVNode(node)) {
      social.push(node)
      continue
    }
    // Markdown often wraps block components in <p>; unwrap pure Social wrappers.
    if (
      typeof node.type === 'string' &&
      Array.isArray(node.children)
    ) {
      const kids = flattenNodes(node.children as VNodeChild[])
      const socialKids = kids.filter(isSocialVNode)
      const otherKids = kids.filter(
        (kid) => !isSocialVNode(kid) && !isWhitespaceText(kid),
      )
      if (socialKids.length > 0 && otherKids.length === 0) {
        social.push(...socialKids)
        continue
      }
    }
    bio.push(node)
  }
  return { bio, social }
})

const avatarSrc = computed(() => {
  try {
    return resolveContentAsset(props.avatar)
  } catch {
    console.warn(`Member: unknown package asset "${props.avatar}"`)
    return ''
  }
})
</script>

<template>
  <article class="syn-member">
    <div class="syn-member__avatar">
      <img
        v-if="avatarSrc"
        :src="avatarSrc"
        :alt="name"
        width="120"
        height="120"
      />
    </div>
    <div class="syn-member__body">
      <h3 class="syn-member__name">{{ name }}</h3>
      <div v-if="partitioned.bio.length" class="syn-member__bio">
        <component
          :is="node"
          v-for="(node, index) in partitioned.bio"
          :key="index"
        />
      </div>
      <div v-if="partitioned.social.length" class="syn-member__socials">
        <component
          :is="node"
          v-for="(node, index) in partitioned.social"
          :key="index"
        />
      </div>
    </div>
  </article>
</template>
