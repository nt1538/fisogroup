// localStorage方法封装
export default {
  /**
   * set 方法，设置
   * @param key String 键
   * @param value 值
   * @param expired 过期时间 ms
   */
  set(key, value, expired=9999999999999999) {
    if (!window.localStorage) return false
    const data = {
      value,
      writeTime: +new Date(), // 写入时间
      expired
    }
    // 值是数组，不能直接存储，需要转换 JSON.stringify
    localStorage.setItem(key, JSON.stringify(data))
  },

  /**
   * get 方法，获取
   * @param key 键
   */
  get(key) {
    if (!window.localStorage) return false
    const dataJSON = localStorage.getItem(key)

    // 当目标不存在时直接结束
    if (!dataJSON) {
      return false
    }
    const data = JSON.parse(dataJSON)
    // 当数据的存在周期未定义时，它被认为是永久的
    if (!data.expired) {
      return data.value
    }
    // 数据声明期结束时释放数据
    if (this.isPass(data)) {
      this.del(key)
      return false
    }
    return data.value
  },

  /**
   * del 方法，删除
   * @param key 键
   */
  del(key) {
    if (!window.localStorage) return false
    localStorage.removeItem(key)
  },

  /**
   * isPass 方法，判断 value 值是否过期
   * @param value 值
   */
  isPass(value) {
    if (!value.value) {
      return true
    }
    const readTime = +new Date()
    return readTime - value.writeTime > value.expired
  }
}
