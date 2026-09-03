import { lstat, mkdir, readFile, symlink } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url))
const projectDirectory = path.resolve(scriptDirectory, '..')
const nodeModulesDirectory = path.join(projectDirectory, 'node_modules')
const linkPath = path.join(nodeModulesDirectory, 'zeppos-app-utils')
const bundledPath = path.join(
  nodeModulesDirectory,
  '@zeppos',
  'zeus-cli',
  'private-modules',
  'zeppos-app-utils',
)

const packageData = JSON.parse(
  await readFile(path.join(bundledPath, 'package.json'), 'utf8'),
)

if (packageData.name !== 'zeppos-app-utils') {
  throw new Error('Unexpected Zeus bundled utility package identity')
}

await mkdir(nodeModulesDirectory, { recursive: true })

try {
  const existing = await lstat(linkPath)
  if (!existing.isSymbolicLink()) {
    throw new Error(
      `${linkPath} exists and is not a symbolic link; refusing to replace it`,
    )
  }

  console.log('Zeus bundled utility link already exists')
} catch (error) {
  if (error.code !== 'ENOENT') {
    throw error
  }

  const relativeTarget = path.relative(nodeModulesDirectory, bundledPath)
  await symlink(relativeTarget, linkPath, 'dir')
  console.log(`Linked Zeus bundled utility: ${relativeTarget}`)
}
