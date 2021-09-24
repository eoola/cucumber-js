import path from 'path'
import stackChain from 'stack-chain'
import { isFileNameInCucumber } from '../stack_trace_filter'
import { doesHaveValue, valueOrDefault } from '../value_checker'
import { ILineAndUri } from '../types'
import CallSite = NodeJS.CallSite
import { fs } from 'mz'
import { SourceMapConsumer } from 'source-map'
import { SourceMap } from 'module'

export function getDefinitionLineAndUri(
  cwd: string,
  isExcluded = isFileNameInCucumber
): ILineAndUri {
  let line: number
  let uri: string
  try {
    const origPrepareStackTrace = Error.prepareStackTrace

    Error.prepareStackTrace = function (_, stack) {
      return stack
    }

    const err = new Error()

    const stack = err.stack as unknown as CallSite[]

    const filename = stack[1].getFileName()

    const source = fs.readFileSync(filename, 'utf8')

    const sourceMappingUrlRegExp = /\/\/[#@] ?sourceMappingURL=([^\s'"]+)\s*$/gm
    let lastSourceMappingUrl
    let matchSourceMappingUrl

    while ((matchSourceMappingUrl = sourceMappingUrlRegExp.exec(source))) {
      lastSourceMappingUrl = matchSourceMappingUrl[1]
    }

    console.log(lastSourceMappingUrl)

    if (lastSourceMappingUrl) {
      const sourceMappingUrl = lastSourceMappingUrl
      const isDataUrl = sourceMappingUrl.substr(0, 5) === 'data:'
      const defaultSourceRoot = filename.substring(
        0,
        filename.lastIndexOf('/') + 1
      )

      const sourceMap = fs.readFileSync(sourceMappingUrl, 'utf8')
      console.log(sourceMap)

      // let sourceConsumer = new SourceMapConsumer(sourceMap);
    }

    console.log(stack)

    /*
    console.log(new Error().stack.split("\n").slice(1).map(
      (line: String) => line.match(/(\/.*):(\d+):\d+/).slice(1,3)
    ))
    */

    const stackframes = stack
    console.log(
      stackframes.map((frame: CallSite) => [
        frame.getLineNumber(),
        frame.getFileName(),
      ])
    )
    const stackframe = stackframes.find(
      (frame: CallSite) =>
        frame.getFileName() !== __filename && !isExcluded(frame.getFileName())
    )
    if (stackframe != null) {
      line = stackframe.getLineNumber()
      uri = stackframe.getFileName()
      if (doesHaveValue(uri)) {
        uri = path.relative(cwd, uri)
      }
    }
  } catch (e) {
    console.warn('Warning: unable to get definition line and uri', e)
  }
  return {
    line: valueOrDefault(line, 0),
    uri: valueOrDefault(uri, 'unknown'),
  }
}
