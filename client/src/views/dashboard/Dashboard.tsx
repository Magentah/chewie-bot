import React, { useEffect, useState } from "react";
import axios from "axios";
import { Switch, Route, useLocation } from "react-router-dom";
import { makeStyles } from "@material-ui/core/styles";
import { Grid, Typography, Divider } from "@material-ui/core";
import SideBar from "../../components/sidebar/SideBar";
import NavBar from "../../components/navbar/NavBar";
import { Route as RouteType, DashboardRoutes, NotFoundRoute } from "../../Routes";

const useStyles = makeStyles((theme) => ({
    root: {
        display: "flex",
    },
    toolbar: {
        marginTop: theme.mixins.toolbar.minHeight,
    },
    content: {
        flexGrow: 1,
        padding: theme.spacing(3),
    },
}));

const createRouteMap = (routes: Array<RouteType>): ((x: string) => RouteType) => {
    const m = new Map<string, RouteType>();
    routes.forEach((route: RouteType) => {
        m.set(route.path, route);
    });

    const curry0 = (x: string) => {
        let route = null;
        if (m.has(x)) {
            route = m.get(x);
        }
        return route ? route : NotFoundRoute;
    };

    return curry0;
};

const Dashboard: React.FC<{}> = (props) => {
    const classes = useStyles();
    const location = useLocation();
    console.log(location.pathname);

    const getRoute = createRouteMap(DashboardRoutes);

    const path = location.pathname;

    const route: RouteType = getRoute(path);

    console.log("Route", route);

    const renderRoute = () => {
        const routeJsx = DashboardRoutes.map((route: RouteType) => (
            <Route exact path={route.path} key={route.name}>
                <route.component />
            </Route>
        ));
        return (
            <Switch>
                {routeJsx}{" "}
                <Route path="*">
                    <NotFoundRoute.component />
                </Route>
            </Switch>
        );
    };
    return (
        <div className={classes.root}>
            <NavBar />
            <SideBar />
            <main className={classes.content}>
                <div className={classes.toolbar}>
                    <Grid container spacing={3}>
                        <Grid item xs={12}>
                            <Typography variant="h5">{route.name}</Typography>
                            <Divider />
                        </Grid>
                        <Grid item xs={12}>
                            {renderRoute()}
                        </Grid>
                    </Grid>
                </div>
            </main>
        </div>
    );
};

export default Dashboard;
