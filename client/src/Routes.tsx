import React from "react";
import { SvgIconTypeMap } from "@mui/material";
import { OverridableComponent } from "@mui/material/OverridableComponent";
import { Typography } from "@mui/material";

// Icons
import { LibraryMusic, QueueMusic, SupervisorAccount, Home, Payment, Build, Message, Extension, EmojiEvents, Event, ChatBubbleOutline, Lens as DefaultIcon } from "@mui/icons-material";

// Business Components
import TwitchCard from "./components/twitch/TwitchCard";
import MusicRequestView from "./views/music-requests/MusicRequestView";
import SongList from "./components/songlist/songlist";
import EditSonglist from "./components/songlist/editSonglist";
import DonationList from "./components/donationlist/donationlist";
import MessageList from "./components/messages/messagelist";
import QuoteList from "./components/quotes/quotelist";
import CommandList from "./components/commands/commandlist";
import NotFound from "./components/error/404";
import { UserLevels } from "./contexts/userContext";
import Login from "./views/login/Login";
import UserList from "./components/users/userlist";
import UserProfileView from "./components/users/userprofile";
import Leaderboard from "./components/users/leaderboard";
import UserCardList from "./components/cards/userCardList";
import ChannelPointRewards from "./components/twitch/ChannelPointRewards";
import UserCardStackList from "./components/cards/userCardStackList";
import AchievementsList from "./components/achievements/achievementsList";
import UserAchievementsList from "./components/achievements/userAchievementsList";
import SeasonList from "./components/seasons/seasonList";

export type Route = {
    path: string;
    name: string;
    component: any;
    icon: OverridableComponent<SvgIconTypeMap<{}, "svg">> | string;
    minUserLevel: UserLevels,
    hideInSidebar?: boolean,
    makeDivider?: (userLevel: UserLevels) => JSX.Element | undefined
};

// Routes to be rendered from the SideBar
const DashboardRoutes: Route[] = [
    {
        path: "/",
        name: "Home",
        icon: Home,
        component: Login,
        minUserLevel: UserLevels.Viewer
    },
    {
        path: "/profile",
        name: "Profile",
        icon: Home,
        component: UserProfileView,
        minUserLevel: UserLevels.Viewer,
        hideInSidebar: true
    },
    {
        path: "/songqueue",
        name: "Song Queue",
        icon: QueueMusic,
        component: MusicRequestView,
        minUserLevel: UserLevels.Viewer
    },
    {
        path: "/songlist",
        name: "Songlist",
        icon: LibraryMusic,
        component: SongList,
        minUserLevel: UserLevels.Viewer
    },
    {
        path: "/leaderboard",
        name: "Leaderboard",
        icon: EmojiEvents,
        component: Leaderboard,
        minUserLevel: UserLevels.Viewer
    },
    {
        path: "/mycards",
        name: "My Cards",
        icon: "contact_page",
        component: UserCardStackList,
        minUserLevel: UserLevels.Viewer
    },
    {
        path: "/myachievements",
        name: "My Achievements",
        icon: "military_tech",
        component: UserAchievementsList,
        minUserLevel: UserLevels.Viewer
    },
    {
        path: "/commands",
        name: "Commands",
        icon: Extension,
        component: CommandList,
        minUserLevel: UserLevels.Viewer,
        makeDivider: (level) => level >= UserLevels.Moderator ?
                <li>
                <Typography
                    style={{marginLeft: "1em", marginTop: "1em"}}
                    color="textSecondary"
                    display="block"
                    variant="caption"
                >Configuration</Typography>
            </li> : undefined
    },
    {
        path: "/editSonglist",
        name: "Songlist",
        icon: LibraryMusic,
        component: EditSonglist,
        minUserLevel: UserLevels.Moderator
    },
    {
        path: "/messages",
        name: "Messages",
        icon: Message,
        component: MessageList,
        minUserLevel: UserLevels.Admin
    },
    {
        path: "/quotes",
        name: "Quotes",
        icon: ChatBubbleOutline,
        component: QuoteList,
        minUserLevel: UserLevels.Moderator
    },
    {
        path: "/usercards",
        name: "Cards",
        icon: "contact_page",
        component: UserCardList,
        minUserLevel: UserLevels.Admin
    },
    {
        path: "/achievements",
        name: "Achievements",
        icon: "military_tech",
        component: AchievementsList,
        minUserLevel: UserLevels.Admin
    },
    {
        path: "/users",
        name: "Users",
        icon: SupervisorAccount,
        component: UserList,
        minUserLevel: UserLevels.Moderator
    },
    {
        path: "/channelpointrewards",
        name: "Channel Points",
        icon: Extension,
        component: ChannelPointRewards,
        minUserLevel: UserLevels.Moderator
    },
    {
        path: "/donations",
        name: "Donations",
        icon: Payment,
        component: DonationList,
        minUserLevel: UserLevels.Moderator
    },
    {
        path: "/seasons",
        name: "Seasons",
        icon: Event,
        component: SeasonList,
        minUserLevel: UserLevels.Admin
    },
    {
        path: "/bot",
        name: "Bot Settings",
        icon: Build,
        component: TwitchCard,
        minUserLevel: UserLevels.Admin
    }
];

const NotFoundRoute: Route = {
    path: "/404",
    name: "Oops...",
    icon: DefaultIcon,
    component: NotFound,
    minUserLevel: UserLevels.Viewer
};

export { DashboardRoutes, NotFoundRoute };
