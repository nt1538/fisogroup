import { createStore, createLogger, Store, useStore as baseUseStore } from 'vuex'
import common from './modules/common'
import { AllStateTypes } from './interface'

export const store = createStore<AllStateTypes>({
  modules: {
    common
  },
  plugins: [createLogger()]
})
