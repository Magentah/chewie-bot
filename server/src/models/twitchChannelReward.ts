export default interface ITwitchChannelReward {
    broadcaster_id: string;
    broadcaster_login: string;
    broadcaster_name: string;
    id: string;
    title: string;
    prompt: string;
    cost: number;
    image: IChannelRewardImage | null;
    default_image: IChannelRewardImage;
    background_color: string;
    is_enabled: boolean;
    is_user_input_required: boolean;
    max_per_stream_setting: IMaxPerStream;
    max_per_user_per_stream_setting: IMaxPerUserPerStream;
    global_cooldown_setting: IGlobalCooldown;
    is_paused: boolean;
    is_in_stock: boolean;
    should_redemptions_skip_request_queue: boolean;
    redemptions_redeemed_current_stream: number;
    cooldown_expires_at: string | null;
}

export interface ITwitchChannelRewardRequest {
    title: string;
    prompt?: string;
    cost: number;
    is_enabled?: boolean;
    background_color?: string;
    is_user_input_required?: boolean;
    is_max_per_stream_enabled?: boolean;
    max_per_stream?: number;
    is_max_per_user_per_stream_enabled?: boolean;
    max_per_user_per_stream?: number;
    is_global_cooldown_enabled?: boolean;
    global_cooldown_seconds?: number;
    should_redemptions_skip_request_queue?: boolean;
}

export interface IChannelRewardImage {
    url_1x: string;
    url_2x: string;
    url_4x: string;
}

export interface IMaxPerStream {
    is_enabled: boolean;
    max_per_stream: number;
}

export interface IMaxPerUserPerStream {
    is_enabled: boolean;
    max_per_user_per_stream: number;
}

export interface IGlobalCooldown {
    is_enabled: boolean;
    global_cooldown_seconds: number;
}
