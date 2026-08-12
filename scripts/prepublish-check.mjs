import { execFileSync } from 'node:child_process'

function run(cmd, args) {
  console.log(`\n> ${cmd} ${args.join(' ')}`)
  execFileSync(cmd, args, { stdio: 'inherit' })
}

run('npm', ['test'])
run('npm', ['run', 'build'])
run('npm', ['run', 'assert:build-artifacts'])
run('npm', ['run', 'assert:pack'])
run('npm', ['run', 'assert:exports'])
run('npm', ['run', 'test:consumer-smoke'])

console.log('\nprepublish-check: all gates passed')
