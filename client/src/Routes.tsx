import React from "react";
import { SvgIconTypeMap } from "@material-ui/core";
import { OverridableComponent } from "@material-ui/core/OverridableComponent";
import { Card, CardContent, Typography } from "@material-ui/core";

// Icons
import { QueueMusic, SupervisorAccount, Gamepad, Home, Payment, Build, Lens as DefaultIcon } from "@material-ui/icons";

// Business Components
import TwitchCard from "./components/twitch/TwitchCard";
import MusicRequestView from "./views/music-requests/MusicRequestView";
import NotFound from "./components/error/404";

export type Route = {
    path: string;
    name: string;
    component: React.FC;
    icon: OverridableComponent<SvgIconTypeMap<{}, "svg">>;
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
    },
    {
        path: "/songqueue",
        name: "Music Requests",
        icon: QueueMusic,
        component: MusicRequestView,
    },
    {
        path: "/raffles",
        name: "Raffles",
        icon: Gamepad,
        component: DefaultComponent,
    },
    {
        path: "/donations",
        name: "Donations",
        icon: Payment,
        component: DefaultComponent,
    },
    {
        path: "/bot",
        name: "Bot Settings",
        icon: Build,
        component: TwitchCard,
    },
    {
        path: "/users",
        name: "Users",
        icon: SupervisorAccount,
        component: DefaultComponent,
    },
];

const NotFoundRoute: Route = {
    path: "/404",
    name: "Oops...",
    icon: DefaultIcon,
    component: NotFound,
};

export { DashboardRoutes, NotFoundRoute };
