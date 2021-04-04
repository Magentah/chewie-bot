import React from "react";
import { SvgIconTypeMap } from "@material-ui/core";
import { OverridableComponent } from "@material-ui/core/OverridableComponent";
import { Card, CardContent, Typography } from "@material-ui/core";

// Icons
import { LibraryMusic, QueueMusic, SupervisorAccount, Home, Payment, Build, Message, Extension, Lens as DefaultIcon } from "@material-ui/icons";

// Business Components
import TwitchCard from "./components/twitch/TwitchCard";
import MusicRequestView from "./views/music-requests/MusicRequestView";
import SongList from "./components/songlist/songlist";
import MessageList from "./components/messages/messagelist";
import CommandList from "./components/commands/commandlist";
import NotFound from "./components/error/404";
import { UserLevels } from "./hooks/user";
import Login from "./views/login/Login";
import UserList from "./components/users/userlist";
import UserProfile from "./components/users/userprofile";

export type Route = {
    path: string;
    name: string;
    component: any;
    icon: OverridableComponent<SvgIconTypeMap<{}, "svg">>;
    minUserLevel: UserLevels,
    hideInSidebar?: boolean
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
        component: UserProfile,
        minUserLevel: UserLevels.Viewer,
        hideInSidebar: true
    },
    {
        path: "/songqueue",
        name: "Music Requests",
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
        path: "/commands",
        name: "Commands",
        icon: Extension,
        component: CommandList,
        minUserLevel: UserLevels.Viewer
    },
    {
        path: "/donations",
        name: "Donations",
        icon: Payment,
        component: DefaultComponent,
        minUserLevel: UserLevels.Moderator
    },
    {
        path: "/bot",
        name: "Bot Settings",
        icon: Build,
        component: TwitchCard,
        minUserLevel: UserLevels.Broadcaster
    },
    {
        path: "/messages",
        name: "Messages",
        icon: Message,
        component: MessageList,
        minUserLevel: UserLevels.Broadcaster
    },
    {
        path: "/users",
        name: "Users",
        icon: SupervisorAccount,
        component: UserList,
        minUserLevel: UserLevels.Moderator
    },
];

const NotFoundRoute: Route = {
    path: "/404",
    name: "Oops...",
    icon: DefaultIcon,
    component: NotFound,
    minUserLevel: UserLevels.Viewer
};

export { DashboardRoutes, NotFoundRoute };
