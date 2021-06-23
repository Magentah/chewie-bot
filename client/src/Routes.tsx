import React from "react";
import { Divider, SvgIconTypeMap } from "@material-ui/core";
import { OverridableComponent } from "@material-ui/core/OverridableComponent";
import { Card, CardContent, Typography } from "@material-ui/core";

// Icons
import { LibraryMusic, QueueMusic, SupervisorAccount, Home, Payment, Build, Message, Extension, EmojiEvents, Lens as DefaultIcon } from "@material-ui/icons";

// Business Components
import TwitchCard from "./components/twitch/TwitchCard";
import MusicRequestView from "./views/music-requests/MusicRequestView";
import SongList from "./components/songlist/songlist";
import DonationList from "./components/donationlist/donationlist";
import MessageList from "./components/messages/messagelist";
import CommandList from "./components/commands/commandlist";
import NotFound from "./components/error/404";
import { UserLevels } from "./hooks/user";
import Login from "./views/login/Login";
import UserList from "./components/users/userlist";
import UserProfileView from "./components/users/userprofile";
import Leaderboard from "./components/users/leaderboard";
import UserCardList from "./components/cards/userCardList";
import ChannelPointRewards from "./components/twitch/ChannelPointRewards";
import UserCardStackList from "./components/cards/userCardStackList";
import AchievementsList from "./components/achievements/achievementsList";
import UserAchievementsList from "./components/achievements/userAchievementsList";

export type Route = {
    path: string;
    name: string;
    component: any;
    icon: OverridableComponent<SvgIconTypeMap<{}, "svg">> | string;
    minUserLevel: UserLevels,
    hideInSidebar?: boolean,
    makeDivider?: (userLevel: UserLevels) => JSX.Element | undefined
};

const DefaultComponent: React.FC<{}> = (props) => {
    return (
        <Card>
            <CardContent>
                <Typography variant="h5">Nothing to see here</Typography>
            </CardContent>
        </Card>
    );
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
        path: "/messages",
        name: "Messages",
        icon: Message,
        component: MessageList,
        minUserLevel: UserLevels.Broadcaster
    },
    {
        path: "/usercards",
        name: "Cards",
        icon: "contact_page",
        component: UserCardList,
        minUserLevel: UserLevels.Broadcaster
    },
    {
        path: "/achievements",
        name: "Achievements",
        icon: "military_tech",
        component: AchievementsList,
        minUserLevel: UserLevels.Broadcaster
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
        path: "/bot",
        name: "Bot Settings",
        icon: Build,
        component: TwitchCard,
        minUserLevel: UserLevels.Broadcaster
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
