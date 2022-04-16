import React, { useContext } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { makeStyles } from "@material-ui/core/styles";
import { List, ListItem, ListItemIcon, ListItemText, Divider, Drawer, Icon } from "@material-ui/core";

import { Route, DashboardRoutes } from "../../Routes";
import { UserContext } from "../../contexts/userContext";

const width = 235;
const useStyles = makeStyles((theme) => {
    return {
        root: {
            backgroundColor: theme.palette.background.paper,
            flexShrink: 0,
            width,
        },
        nested: {
            paddingLeft: theme.spacing(4),
        },
        drawer: {
            width,
        },
        drawerPaper: {
            width,
        },
        toolbar: {
            marginTop: theme.mixins.toolbar.minHeight,
        },
    };
});

const SideBar: React.FC<any> = (props: any) => {
    const isOpened: boolean = true;
    const location = useLocation();
    const history = useNavigate();
    const classes = useStyles();
    const userContext = useContext(UserContext);

    const reroute = (path: string) => {
        history(path);
    };
    const renderRoutes = (routes: Route[]) => {
        const listItems = routes.map((r: Route, i: number) => {
            if (userContext.user.userLevel < r.minUserLevel || r.hideInSidebar === true) {
                return null;
            }

            return (
                <React.Fragment key={r.name + r.minUserLevel}>
                    <Divider />
                    {r.makeDivider ? r.makeDivider(userContext.user.userLevel) : undefined}
                    <ListItem button selected={r.path === location.pathname} onClick={() => reroute(r.path)}>
                        {r.icon && (
                            <ListItemIcon>
                                {typeof r.icon === "string" ? <Icon>{r.icon}</Icon> : <r.icon />}
                            </ListItemIcon>
                        )}
                        <ListItemText primary={r.name} />
                    </ListItem>
                    {i === routes.length - 1 && <Divider />}
                </React.Fragment>
            );
        });

        return (
            <div className={classes.toolbar}>
                <List> {listItems} </List>
            </div>
        );
    };

    return (
        <div className={classes.root}>
            <Drawer variant="persistent" open={isOpened} anchor="left" classes={{ paper: classes.drawerPaper }}>
                {renderRoutes(DashboardRoutes)}
            </Drawer>
        </div>
    );
};

export default SideBar;
