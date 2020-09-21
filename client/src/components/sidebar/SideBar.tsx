import React from "react";
import { useHistory, useLocation } from "react-router-dom";
import { makeStyles } from "@material-ui/core/styles";
import {
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Divider,
  Drawer,
} from "@material-ui/core";

import { Route, DashboardRoutes } from "../../Routes";

const width = 230;
const useStyles = makeStyles((theme) => {
  return {
    root: {
      backgroundColor: theme.palette.background.paper,
      flexShrink: 0,
      width: width,
    },
    nested: {
      paddingLeft: theme.spacing(4),
    },
    drawer: {
      width: width,
    },
    drawerPaper: {
      width: width,
    },
    toolbar: {
      marginTop: theme.mixins.toolbar.minHeight,
    },
  };
});

const SideBar: React.FC<any> = (props: any) => {
  const isOpened: boolean = true;
  const location = useLocation();
  const history = useHistory();
  const classes = useStyles();
  console.log("SideBar", location.pathname);

  const reroute = (path: string) => {
    console.log("reroute", path);
    history.push(path);
  };
  const renderRoutes = (routes: Array<Route>) => {
    const listItems = routes.map((r: Route, i: number) => {
      return (
        <React.Fragment>
          <Divider />
          <ListItem
            button
            selected={r.path === location.pathname}
            onClick={() => reroute(r.path)}
          >
            {r.icon && (
              <ListItemIcon>
                <r.icon />
              </ListItemIcon>
            )}
            <ListItemText primary={r.name} />
          </ListItem>
          {i == routes.length - 1 && <Divider />}
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
      <Drawer
        variant="persistent"
        open={isOpened}
        anchor="left"
        classes={{ paper: classes.drawerPaper }}
      >
        {renderRoutes(DashboardRoutes)}
      </Drawer>
    </div>
  );
};

export default SideBar;
