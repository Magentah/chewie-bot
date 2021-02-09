import React from "react";
import { SvgIconTypeMap } from "@material-ui/core";
import { OverridableComponent } from "@material-ui/core/OverridableComponent";
import { Card, CardContent, Typography } from "@material-ui/core";

// Icons
import { LibraryMusic, QueueMusic, SupervisorAccount, Home, Payment, Build, Lens as DefaultIcon } from "@material-ui/icons";

// Business Components
import TwitchCard from "./components/twitch/TwitchCard";
import MusicRequestView from "./views/music-requests/MusicRequestView";
import NotFound from "./components/error/404";
import { UserLevels } from "./hooks/user";

export type Route = {
    path: string;
    name: string;
    component: any;
    icon: OverridableComponent<SvgIconTypeMap<{}, "svg">>;
    minUserLevel: UserLevels
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
const DashboardRoutes: Array<Route> = [
    {
        path: "/",
        name: "Home",
        icon: Home,
        component: DefaultComponent,
        minUserLevel: UserLevels.Viewer
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
        component: DefaultComponent,
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
        minUserLevel: UserLevels.Moderator
    },
    {
        path: "/users",
        name: "Users",
        icon: SupervisorAccount,
        component: DefaultComponent,
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
