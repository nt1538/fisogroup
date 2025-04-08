import { App, Component } from "vue"

export default {
  install(Vue: App<Element>) {
    const ComponentsFile = import.meta.globEager('./fs-**/**.vue')
    for(let file in ComponentsFile) {
      const name = (file && file?.match(/\.\/(fs-\w+)\/\w+\.vue/)[1]) || Date.now().toString(); // eslint-disable-line
      Vue.component(name, ComponentsFile[file].default)
    }
    // Object.values(ComponentsFile).map((file) => {
    //   const name = file.default?.__file.match(/components\/(fs-\w+)\/\w+\.vue/)[1];
    //   Vue.component(file.default.name, file.default)
    // })
  }
}
