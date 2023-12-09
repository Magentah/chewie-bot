import React, { useContext, useState } from "react";
import { Routes, Route, useLocation } from "react-router-dom";
import { makeStyles } from "makeStyles";
import { Grid, Typography, Divider, Theme, Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions, Button, IconButton, useTheme } from "@mui/material";
import SideBar from "../../components/sidebar/SideBar";
import NavBar from "../../components/navbar/NavBar";
import { Route as RouteType, DashboardRoutes, NotFoundRoute } from "../../Routes";
import { UserContext } from "../../contexts/userContext";
import { Brightness7, Brightness4 } from "@mui/icons-material";
import { ColorModeContext, SidebarWidth } from "defaultTheme";

const useStyles = makeStyles()((theme: Theme) => ({
    root: {
        display: "flex",
    },
    toolbar: {
        marginTop: theme.mixins.toolbar.minHeight,
    },
    content: {
        flexGrow: 1,
        padding: theme.spacing(3)
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
    const { classes } = useStyles();
    const location = useLocation();
    const theme = useTheme();
    const colorMode = useContext(ColorModeContext);
    const getRoute = createRouteMap(DashboardRoutes);
    const userContext = useContext(UserContext);
    const [dialogClosed, setDialogClosed] = useState(false);

    const path = location.pathname;

    const routeForPath: RouteType = getRoute(path);

    const renderRoute = () => {
        // Show loading text until user permissions are confirmed.
        if (!userContext.user.userLevel) {
            return <Typography>Loading...</Typography>;
        }

        const routeJsx = DashboardRoutes.map((route: RouteType) => (
             (userContext.user.userLevel >= route.minUserLevel) ?
                <Route path={route.path} key={route.name + route.minUserLevel} element={<route.Component />} />
                : undefined
        ));

        return (
            <Routes>
                {routeJsx}{" "}
                <Route path="*" element={<NotFoundRoute.Component />} />
            </Routes>
        );
    };

    return (
        <div className={classes.root}>
            <Dialog open={(userContext.user.missingBroadcasterPermissions?.length ?? 0) > 0 && !dialogClosed}>
                <DialogTitle>
                    {"Twitch permission update required"}
                </DialogTitle>
                <DialogContent>
                    <DialogContentText>
                        The current permissions acquired through authorization with Twitch need to be updated. <br />
                        New permissions needed: {userContext.user.missingBroadcasterPermissions?.join("\r\n") ?? ""}
                    </DialogContentText>
                </DialogContent>
                <DialogActions>
                    <Button href="/api/auth/twitch/broadcaster" color="primary" autoFocus>Update permissions</Button>
                    <Button onClick={() => setDialogClosed(true)}>
                        Ignore
                    </Button>
                </DialogActions>
            </Dialog>
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

            <div style={{position: "absolute", zIndex: 1200, width: SidebarWidth, textAlign: "center" }}>
                <IconButton sx={{ ml: 1 }} onClick={colorMode.toggleColorMode} color="inherit" title="Toggle dark mode">
                    {theme.palette.mode === 'dark' ? <Brightness7 /> : <Brightness4 />}
                </IconButton>
            </div>
        </div>
    );
};

export default Dashboard;
