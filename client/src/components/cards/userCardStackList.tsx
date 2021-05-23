import React, { useCallback, useEffect, useState } from "react";
import { makeStyles } from "@material-ui/core/styles";
import axios from "axios";
import { Box, Button, Typography, Grid, Card, Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions, Paper, PaperProps } from "@material-ui/core";
import { Image } from "react-bootstrap";
import * as Cookie from "js-cookie";

const useStyles = makeStyles((theme) => ({
    cardsCountBox: {
        textTransform: "uppercase",
        fontWeight: "bold",
    },
    cardsCountFont: {
        fontSize: theme.typography.h5.fontSize,
        textAlign: "center",
        width: "6em"
    },
    collectionHeader: {
        marginTop: theme.spacing(2)
    },
    cardsGrid: {
        background: theme.palette.divider,
        padding: theme.spacing(1)
    },
    noCardsGrid: {
        background: theme.palette.divider,
        padding: theme.spacing(15, 5)
    },
    individualCardCounter: {
        borderRadius: "1em",
        background: theme.palette.background.default,
        padding: theme.spacing(0.25, 1),
        marginBottom: theme.spacing(1)
    },
    individualCardCounterText: {
        fontSize: "0.9em",
        color: theme.palette.text.hint
    },
    noCardsText: {
        textTransform: "uppercase"
    },
}));

type RowData = { id?: number, name: string, setName: string, rarity: number, imageId: string, url: string, cardCount: number };

const UserCardStackList: React.FC<any> = (props: any) => {
    const [cardlist, setCardlist] = useState([] as RowData[]);
    const [cardcount, setCardcount] = useState(0);
    const [resetDialogOpen, setResetDialogOpen] = useState(false);
    const [redeemInfoResultMsg, setRedeemInfoResultMsg] = useState("");

    const classes = useStyles();
    const userProfile = Cookie.getJSON("user");

    const updateCards = useCallback(() => {
        axios.get("/api/mycards").then((response) => {
            if (response) {
                setCardlist(response.data.cards);
                setCardcount(response.data.count);
            }
        });
    }, []);

    const handleCloseReset = (redeemCard: boolean) => {
        setResetDialogOpen(false);

        if (redeemCard) {
            axios.post("/api/redeemcard").then((result) => {
                if (result.status === 200) {
                    if (typeof result.data === "string") {
                        setRedeemInfoResultMsg(result.data);
                    } else {
                        setRedeemInfoResultMsg(`You got ${result.data.name}!`);
                        updateCards();
                    }
                }
            })
        }
    };

    useEffect(() => updateCards(), []);

    // TODO: Get from settings controller.
    const cardCost = 1000;
    function PaperComponent(paperProps: PaperProps) {
        return (
          <Paper {...paperProps} style={{overflow: "visible", paddingLeft: "4em"}} />
        );
    }

    return <Card>
            <Dialog open={redeemInfoResultMsg !== ""} onClose={() => setRedeemInfoResultMsg("")}>
                <DialogTitle>Redeem dango card</DialogTitle>
                <DialogContent>
                    <DialogContentText>{redeemInfoResultMsg}</DialogContentText>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setRedeemInfoResultMsg("")} color="primary" autoFocus>Close</Button>
                </DialogActions>
            </Dialog>
            <Dialog open={resetDialogOpen} onClose={() => handleCloseReset(false)} PaperComponent={PaperComponent}>
                <DialogTitle>Get a random dango card</DialogTitle>
                <DialogContent style={{overflow: "visible"}}>
                    <Image src={"/assets/Dango-Card-Pop-Up.png"} alt="" style={{marginLeft: "-11em", marginTop: "-9em", width:"12em", position: "absolute", zIndex: 100}} />
                    {userProfile.username ?
                    <Typography>Would you like to trade {cardCost} chews for a random dango card?</Typography>
                    :<Typography>You need to be logged in to start collecting dango cards!</Typography>}
                </DialogContent>
                {userProfile.username ?
                <DialogActions>
                    <Button onClick={() => handleCloseReset(true)} color="primary" autoFocus>Trade</Button>
                    <Button onClick={() => handleCloseReset(false)} color="primary">Cancel</Button>
                </DialogActions> :
                <DialogActions>
                    <Button onClick={() => handleCloseReset(false)} color="primary">OK</Button>
                </DialogActions>}
            </Dialog>
            <Grid xs>
                <Box padding={3}>
                    <Grid item>
                        <Grid item container>
                            <Grid item className={classes.cardsCountBox}>
                                <Grid item>
                                    Dango cards collected so far
                                </Grid>
                                <Grid item>
                                    <Box border={2} paddingLeft={2} paddingRight={2} paddingTop={1} paddingBottom={1} className={classes.cardsCountFont}>
                                        {cardlist.length} / {cardcount}
                                    </Box>
                                </Grid>
                            </Grid>
                            <Grid item xs />
                            <Grid item>
                                <Button variant="contained" color="primary" onClick={() => setResetDialogOpen(true)}>Get a dango card</Button>
                            </Grid>
                        </Grid>
                    </Grid>
                    <Grid item className={classes.collectionHeader}>
                        <Typography variant="h6">Your collection</Typography>
                    </Grid>
                    <Grid item>
                        {cardlist.length === 0 ?
                        <Box className={classes.noCardsGrid} padding={15}>
                            <Grid>
                                <Grid item>
                                    <Typography align="center" variant="h6" className={classes.noCardsText} style={{marginBottom: "2em"}}>You don't have any cards yet</Typography>
                                </Grid>
                                <Grid item>
                                    <Typography align="center" className={classes.noCardsText}>You can trade {cardCost} chews for a radom dango card!</Typography>
                                </Grid>
                            </Grid>
                        </Box> :
                        <Box flexWrap="wrap" display="flex" className={classes.cardsGrid}>
                            {cardlist.map((tile) => (
                            <Box m={1}><Grid key={tile.name}>
                                <Grid item>
                                    <Box display="flex" justifyContent="center">
                                        <Box className={classes.individualCardCounter}>
                                            <Typography className={classes.individualCardCounterText} align="center">× {tile.cardCount}</Typography>
                                        </Box>
                                    </Box>
                                </Grid>
                                <Grid item></Grid><Image title={tile.name} height={250} src={tile.url} alt={tile.name} />
                            </Grid></Box>
                            ))}
                        </Box>}
                    </Grid>
                </Box>
        </Grid>
    </Card>;
};

export default UserCardStackList;
