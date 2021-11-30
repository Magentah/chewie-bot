import React, { useCallback, useEffect, useState } from "react";
import { makeStyles } from "@material-ui/core/styles";
import axios from "axios";
import { Box, Typography, Grid, Card, Button, Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions, PaperProps, Paper, Icon } from "@material-ui/core";
import { Image } from "react-bootstrap";
import CheckCircleIcon from "@material-ui/icons/CheckCircle";

const useStyles = makeStyles((theme) => ({
    collectionHeader: {
        marginTop: theme.spacing(2)
    },
    achievementDescription: {
        marginTop: theme.spacing(1),
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
    uppercase: {
        textTransform: "uppercase"
    },
    achievement: {
        position: "relative",
        "& .redeem-button": {
            display: "none"
        },
        "&:hover .redeem-button": {
            display: "flex"
        }
    },
    redeemIcon: {
        position: "absolute",
        top: "0px",
        right: "0px",
        zIndex: 10
    },
    redeemButtonOverlay: {
        position: "absolute",
        top: "50%",
        left: "50%",
        transform: "translate(-50%, -50%)",
        zIndex: 10
     }
}));

type RowData = { achievementId: number, date: Date, expiredDate: Date, mimetype: string, imageId: string, url: string, name: string, group: string, pointRedemption: number, redemptionDate: Date };

const UserAchievementList: React.FC<any> = (props: any) => {
    const [achievementList, setAchievementList] = useState([] as RowData[]);
    const [achievementToRedeem, setAchievementToRedeem] = useState<RowData>();

    const classes = useStyles();

    const updateAchievements = useCallback(() => {
        axios.get("/api/myachievements").then((response) => {
            if (response) {
                setAchievementList(response.data);
            }
        });
    }, []);

    const redeemAchievement = (achievement: RowData | undefined) => {
        axios.post("/api/myachievements/redeem", achievement).then((result) => {
            setAchievementToRedeem(undefined);
            updateAchievements();
        });
    };

    useEffect(() => updateAchievements(), [updateAchievements]);

    if (achievementList.length === 0) {
        return <Card>
                   <Grid>
                        <Box padding={3}>
                            <Grid item>
                                <Box className={classes.noAchievementsGrid} padding={15}>
                                    <Grid>
                                        <Grid item>
                                            <Typography align="center" variant="h6" className={classes.uppercase} style={{marginBottom: "2em"}}>You don't have any achievements yet</Typography>
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

    function PaperComponent(paperProps: PaperProps) {
        return (
          <Paper {...paperProps} style={{overflow: "visible", paddingLeft: "4em", paddingRight: "1em", paddingBottom: "0.5em", minWidth: "30em"}} />
        );
    }

    return <Card>
            <Dialog open={achievementToRedeem !== undefined} onClose={() => setAchievementToRedeem(undefined)} PaperComponent={PaperComponent}>
                <DialogTitle>Redeem Achievements for Chews</DialogTitle>
                <DialogContent style={{overflow: "visible"}}>
                    <Image src={"/assets/Redeem-Achievement.png"} alt="" style={{marginLeft: "-11em", marginTop: "-9em", width:"10em", position: "absolute", zIndex: 100}} />
                    <DialogContentText>Would you like to claim {achievementToRedeem?.pointRedemption} chews from this achievement?</DialogContentText>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => redeemAchievement(achievementToRedeem)} color="primary" autoFocus>Yes</Button>
                    <Button onClick={() => setAchievementToRedeem(undefined)}>No</Button>
                </DialogActions>
            </Dialog>
        {Object.keys(groupedResult).map((group) => (
            <Grid>
                <Box padding={3}>
                    <Grid item>
                        <Typography variant="h6" className={classes.uppercase}>{group}</Typography>
                    </Grid>
                    <Grid item>
                        <Box flexWrap="wrap" display="flex" className={classes.achievementsGrid}>
                            {groupedResult[group].map((tile: RowData) => (
                            <Box>
                                <Box m={1} width={140}>
                                    <Grid container direction="column" alignItems="center" style={{opacity: tile.date ?  1 : 0.2}} className={classes.achievement}>
                                        <Grid item>
                                            <Image title={tile.name} height={100} src={tile.url} alt={""} />
                                            {tile.pointRedemption && tile.date && !tile.redemptionDate ?
                                            <React.Fragment>
                                                <Icon className={classes.redeemIcon}>paid</Icon>
                                                <Button className={`redeem-button ${classes.redeemButtonOverlay}`} variant="contained" color="primary" onClick={() => setAchievementToRedeem(tile)}>
                                                    Redeem {tile.pointRedemption}
                                                </Button>
                                            </React.Fragment> : undefined}
                                            {tile.pointRedemption && tile.redemptionDate ? <CheckCircleIcon className={classes.redeemIcon} /> : undefined}
                                        </Grid>
                                        <Grid item>
                                            <Typography className={classes.achievementDescription} variant="body2" align="center">{tile.name}</Typography>
                                        </Grid>
                                    </Grid>
                                </Box>
                            </Box>
                            ))}
                        </Box>
                    </Grid>
                </Box>
        </Grid>))}
    </Card>;
};

export default UserAchievementList;
