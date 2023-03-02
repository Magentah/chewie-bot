import { SubscriptionPlan , SubType } from "../services/streamlabsService";

export interface ITwitchAuthResponse {
    access_token: string;
    expires_in: string;
    refresh_token: string;
    scope: string[];
    token_type: string;
    id_token: string;
}

export interface ITwitchRedirectResponse {
    code: string;
    scope: string;
}

export interface ITwitchUser {
    id: string;
    username: string;
}

type ITwitchPubSubSubscriptionRegular = {
    benefit_end_month: number,
    user_name: string,
    display_name: string,
    channel_name: string,
    user_id: string,
    channel_id: number,
    time: string,
    sub_message: {
      message: string,
      emotes: any
    },
    sub_plan: SubscriptionPlan,
    sub_plan_name: string,
    months: number,
    cumulative_months: number,
    context: SubType,
    is_gift: false,
    multi_month_duration: number
}

type ITwitchPubSubSubscriptionGift = {
    benefit_end_month: number,
    user_name: string,
    display_name: string,
    channel_name: string,
    user_id: string,
    channel_id: number,
    recipient_id: string,
    recipient_user_name: string,
    recipient_display_name: string,
    time: string,
    sub_message: {
      message: string,
      emotes: any
    },
    sub_plan: SubscriptionPlan,
    sub_plan_name: string,
    months: number,
    cumulative_months: number,
    context: "subgift",
    is_gift: true,
    multi_month_duration: number
  }

export type ITwitchPubSubSubscription = ITwitchPubSubSubscriptionGift | ITwitchPubSubSubscriptionRegular;