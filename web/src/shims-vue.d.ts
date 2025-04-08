/* eslint-disable */
// https://cn.vitejs.dev/guide/features.html#client-types
/// <reference types="vite/client" />
declare module '*.vue' {
  import type { DefineComponent } from 'vue'
  const component: DefineComponent<{}, {}, any>
  export default component
}

declare type loadParams = {
  page_no: number,
  page_size: number,
  city_name?: string,
  guider_type?: 0 | 1 | 2,
  true_name?: string
}

declare interface GuiderTypes {
  guider_type: 1 | 2,
  guider_ucid: string,
  id: number,
  is_used: 0 | 1,
  nick_name: string,
  operate_time: string,
  operation_name: string,
  portrait_img: string,
  true_name: string,
  user_id: number,
  work_end_time: string,
  work_start_time: string,
  service_city: string[]
}

interface BaseGuiderTypes {
  operation: 1 | 2,
  operate_user_id: number,
  user_id: number,
  guider_ucid: string,
  phone: string,
  portrait_img: string,
  cover_img: string,
  privacy_mode_img: string,
  dynamic_effect: string,
  nick_name: string,
  true_name: string,
  guider_type: 1 | 2,
  is_used?: 0 | 1,
  introduce_video?: string,
  we_chat_qr: string,
  remark?: string,
}

type ShopGuiderTypes =  BaseGuiderTypes & {
  shop_id: number,
  service_citys?: string,
}

type CommonGuiderTypes = BaseGuiderTypes & {
  sex: 0 | 1,
  service_citys?: string[],
  work_start_time: string,
  work_end_time: string,
  rest_time_one: string,
  rest_time_two: string,
  guider_tags?: {
    order: number,
    guider_tag: string
  },
  self_introduce: string,
}
