import React, { useContext } from "react";
import { Routes, Route, useLocation } from "react-router-dom";
import { makeStyles } from "@material-ui/core/styles";
import { Grid, Typography, Divider } from "@material-ui/core";
import SideBar from "../../components/sidebar/SideBar";
import NavBar from "../../components/navbar/NavBar";
import { Route as RouteType, DashboardRoutes, NotFoundRoute } from "../../Routes";
import { UserContext } from "../../contexts/userContext";

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

const createRouteMap = (routes: RouteType[]): ((x: string) => RouteType) => {
    const m = new Map<string, RouteType>();
    routes.forEach((route: RouteType) => {
        m.set(route.path, route);
    });

    const curry0 = (x: string) => {
        let route;
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
    const getRoute = createRouteMap(DashboardRoutes);
    const userContext = useContext(UserContext);

    const path = location.pathname;

    const routeForPath: RouteType = getRoute(path);

    const renderRoute = () => {
        // Show loading text until user permissions are confirmed.
        if (!userContext.user.userLevel) {
            return <Typography>Loading...</Typography>;
        }

        const routeJsx = DashboardRoutes.map((route: RouteType) => (
             (userContext.user.userLevel >= route.minUserLevel) ?
                <Route path={route.path} key={route.name + route.minUserLevel} element={<route.component />} />
                : undefined
        ));

        return (
            <Routes>
                {routeJsx}{" "}
                <Route path="*" element={<NotFoundRoute.component />} />
            </Routes>
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
                            <Typography variant="h5">{routeForPath.name}</Typography>
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
