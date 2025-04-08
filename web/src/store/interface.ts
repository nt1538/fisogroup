import { UserModuleTypes } from './modules/common'

export default interface RootStateTypes {
}

export interface AllStateTypes extends RootStateTypes {
    user: UserModuleTypes
}

