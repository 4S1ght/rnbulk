#!/usr/bin/env node

import fs, { promises as fsp } from 'fs'
import path from 'path'
import rl from 'readline'

// Args =============================================================

const shiftExtensionName = process.argv.includes('--shift')
const caseSensitive      = process.argv.includes('--cs')

let [rt, bin, targetStr, replacer = ""] = process.argv
const target = new RegExp(targetStr, caseSensitive ? 'g' : 'gi')

const cwd = process.cwd()

const files = fs.readdirSync(cwd)
const affectedFiles = files.filter(name => target.test(name))
const nonAffectedFiles = files.length - affectedFiles.length

// State changes ====================================================

console.log(`\nTarget pattern: \x1b[31m${target.source}\x1b[0m`)
console.log(`Replacer:       \x1b[31m${replacer || "[empty]"}\x1b[0m`)
console.log('Changes:')

const rounds = Math.min(5, affectedFiles.length)

let longestName = 0
for (let i = 0; i < rounds; i++) longestName = Math.max(longestName, affectedFiles[i].length)

for (let i = 0; i < rounds; i++) {
    const name = affectedFiles[i]
    console.log(
        `  \x1b[2m${i+1}.\x1b[0m ${name.padEnd(longestName, ' ')}  ` +
        `\x1b[2m->\x1b[0m  ` + 
        `${name.replace(target, (x) => getReplacerType(replacer, x))}\x1b[0m`
    )
}

console.log(affectedFiles.length > 5 ? `  \x1b[2m6.\x1b[0m\x1b[33m  +${affectedFiles.length-5} more file${affectedFiles.length < 1 ? 's' : ''}\n\x1b[0m` : '')

const rli = rl.createInterface(process.stdin, process.stdout, undefined, true)
rli.question('\x1b[2mProceed? [y/n] \x1b[0m', async answer => {
    const yes = ['y', 'yes'].includes(answer)
    if (yes) {
        await renameAll()
        process.exit(0)
    }
    else {
        console.log('\x1b[31mOperation terminated. [y/yes] Answer required.\x1b[0m\n')
        process.exit(1)
    }
})


// Helpers ==========================================================

function getReplacerType(replacer: string, original: string) {
    return replacer.length === 0
        ? `\x1b[2m\x1b[9m${original}\x1b[0m`
        : `\x1b[32m${replacer}\x1b[0m`
}

async function renameAll() {
    let longestName = 0
    for (let i = 0; i < affectedFiles.length; i++) longestName = Math.max(longestName, affectedFiles[i].length)
    for (let i = 0; i < affectedFiles.length; i++) {
        const renameFrom = affectedFiles[i]
        let renameTo = renameFrom.replace(target, replacer)
        if (shiftExtensionName) renameTo = renameTo.replace(/\s+(\.[^.]+)$/, '$1')

        await fsp.rename(
            path.join(cwd, renameFrom),
            path.join(cwd, renameTo)
        )
        console.log(`\x1b[2m${renameFrom.padEnd(longestName, ' ')} --> ${renameTo}\x1b[0m`)
    }
}