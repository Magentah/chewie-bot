import React, { useCallback, useEffect, useState } from "react";
import { makeStyles } from "@material-ui/core/styles";
import axios from "axios";
import { Box, Typography, Grid, Card } from "@material-ui/core";
import { Image } from "react-bootstrap";
import * as Cookie from "js-cookie";

const useStyles = makeStyles((theme) => ({
    collectionHeader: {
        marginTop: theme.spacing(2)
    },
    achievementsGrid: {
        background: theme.palette.divider,
        padding: theme.spacing(1),
        marginTop: theme.spacing(2)
    },
    noAchievementsGrid: {
        background: theme.palette.divider,
        padding: theme.spacing(15, 5),
        marginTop: theme.spacing(2)
    },
    noDataText: {
        textTransform: "uppercase"
    },
}));

type RowData = { achievementId: number, date: Date, expiredDate: Date, mimetype: string, imageId: string, url: string, description: string, group: string };

const UserAchievementList: React.FC<any> = (props: any) => {
    const [achievementList, setAchievementList] = useState([] as RowData[]);

    const classes = useStyles();
    const userProfile = Cookie.getJSON("user");

    const updateAchievements = useCallback(() => {
        axios.get("/api/myachievements").then((response) => {
            if (response) {
                setAchievementList(response.data);
            }
        });
    }, []);

    useEffect(() => updateAchievements(), []);

    if (achievementList.length === 0) {
        return <Card>
                   <Grid>
                        <Box padding={3}>
                            <Grid item>
                                <Box className={classes.noAchievementsGrid} padding={15}>
                                    <Grid>
                                        <Grid item>
                                            <Typography align="center" variant="h6" className={classes.noDataText} style={{marginBottom: "2em"}}>You don't have any achievements yet</Typography>
                                        </Grid>
                                    </Grid>
                                </Box>
                            </Grid>
                        </Box>
                    </Grid>
                </Card>;
    }

    // Group achievements by category
    const groupedResult = achievementList.reduce((r, a) => {
        r[a.group] = r[a.group] || [];
        r[a.group].push(a);
        return r;
    }, Object.create(null));

    return <Card>
        {Object.keys(groupedResult).map((group) => (
            <Grid>
                <Box padding={3}>
                    <Grid item>
                        <Typography variant="h6">{group}</Typography>
                    </Grid>
                    <Grid item>
                        <Box flexWrap="wrap" display="flex" className={classes.achievementsGrid}>
                            {groupedResult[group].map((tile: RowData) => (
                            <Box m={1}>
                                <Grid container direction="column" alignItems="center">
                                    <Grid item>
                                        <Image title={tile.description} height={100} src={tile.url} alt={tile.description} />
                                    </Grid>
                                    <Grid item>
                                        <Typography align="center">{tile.description}</Typography>
                                    </Grid>
                                </Grid>
                            </Box>
                            ))}
                        </Box>
                    </Grid>
                </Box>
        </Grid>))}
    </Card>;
};

export default UserAchievementList;
