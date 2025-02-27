import fs from 'fs'
import walk from 'walk'
import path from 'path'
import logger from '@fonos/logger'
import tar from 'tar'

const fsInstance = () => {
  const Minio = require('minio')
  return new Minio.Client({
    endPoint: process.env.FS_HOST,
    port: parseInt(process.env.FS_PORT),
    useSSL: false,
    accessKey: process.env.FS_USERNAME,
    secretKey: process.env.FS_SECRET
  })
}

const uploadToFS = (
  bucket: string,
  pathToObject: string,
  object?: string,
  metadata: object = {}
) =>
  new Promise((resolve, reject) => {
    const splitPath = (p: string) => path.dirname(p).split(path.sep)
    const dirCount = splitPath(pathToObject).length
    const baseDir = splitPath(pathToObject)
      .slice(0, dirCount)
      .join('/')
    const walker = walk.walk(pathToObject)

    walker.on(
      'file',
      (root: string, stats: { name: string }, next: () => void) => {
        const filePath = root + '/' + stats.name
        const destFilePath = root + '/' + (object || stats.name)
        const dest = destFilePath.substring(baseDir.length + 1)

        fsInstance().fPutObject(
          bucket,
          dest,
          filePath,
          metadata,
          (err: any) => {
            if (err) {
              reject(err)
            } else {
              next()
            }
          }
        )
      }
    )

    walker.on('errors', (root: any, nodeStatsArray: any, next: any) => {
      reject(root)
    })

    walker.on('end', () => {
      resolve()
    })
  })

const removeDirSync = (path: string) => {
  if (fs.existsSync(path)) {
    const files = fs.readdirSync(path)

    if (files.length > 0) {
      files.forEach(function (filename: string) {
        if (fs.statSync(path + '/' + filename).isDirectory()) {
          removeDirSync(path + '/' + filename)
        } else {
          fs.unlinkSync(path + '/' + filename)
        }
      })
      fs.rmdirSync(path)
    } else {
      fs.rmdirSync(path)
    }
  } else {
    logger.log('warn', 'Directory path not found.')
  }
}

const extract = (source: string, target: string) =>
  tar.extract({ file: source, cwd: target })
const getFilesizeInBytes = (filename: string) => fs.statSync(filename)['size']

const mapToObj = (map: {
  toArray: () => {
    (): any
    new (): any
    length: number
    reduce: { (arg0: (e: any[]) => {}): any; new (): any }
  }
}) => {
  if (!map || map.toArray().length === 0) return {}
  return map.toArray().reduce((e: any[]) => {
    const r: any = {}
    r[e[0]] = e[1]
    return r
  })
}

export {
  extract,
  removeDirSync,
  fsInstance,
  uploadToFS,
  getFilesizeInBytes,
  mapToObj
}
