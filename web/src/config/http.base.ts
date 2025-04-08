import fetch from './axios.config'

let API_HOST = process.env.NODE_ENV === 'development' ? '/api' : '/api'
const DEFAULT_CONFIG = {
  isAutoMsg: true,
  isLoading: true,
  isApiHost: true,
  isRemoveField: false,
  removeField: []
}

const POST_HEADER = {
  headers: {
    'content-type': 'application/json'
  }
}
interface Result<T> {
  data: any
  msg: string
  error_msg: string
  status: number
  code: number
  ts: number
  version: number
}

export function get<R>(url: string, params = {}, config = {}) {
  let opts: any = { ...DEFAULT_CONFIG, ...config }
  opts.params = getParams(params, opts)
  return fetch.get<any, Result<R>>(getUrl(url, opts.isApiHost), opts)
}

export function post<T>(url: string, params = {}, config = {}) {
  let opts = { ...DEFAULT_CONFIG, ...POST_HEADER, ...config }
  return fetch.post<any, Result<T>>(getUrl(url, opts.isApiHost), getParams(params, opts), opts)
}

function getUrl(url: string, isApiHost: boolean) {
  if (!isApiHost) return url
  let arr = url.indexOf('apiMock/') !== -1 ? [] : [API_HOST]
  if (!url.startsWith('/')) arr.push('/')
  arr.push(url)
  return arr.join('')
}

function getParams(params, config) {
  if (!config.isRemoveField) return params
  return removeEmptyField(params, config.removeField)
}

function removeEmptyField(params = {}, removeField = []) {
  let copyParams = JSON.parse(JSON.stringify(params))
  let arrField: any = removeField
  if (removeField.length === 0) arrField = Object.keys(params)
  arrField.forEach((key) => {
    let val = copyParams[key]
    if (val === '' || val === undefined || val === null) {
      delete copyParams[key]
    }
  })
  return copyParams
}

export const removeField = removeEmptyField
