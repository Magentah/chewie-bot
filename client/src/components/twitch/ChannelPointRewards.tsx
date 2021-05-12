import React, { useEffect, useState } from "react";
import { makeStyles } from "@material-ui/core/styles";
import { Popover, Box, Grid, Button, TextField, MenuItem, Dialog, DialogTitle, DialogActions, DialogContent, DialogContentText } from "@material-ui/core";
import { Add, Save, Delete } from "@material-ui/icons";
import axios from "axios";
import MaterialTable from "material-table";
import useUser from "../../hooks/user";

type RowData = { twitchRewardId: number, title: string, cost: number, isEnabled: boolean, isGlobalCooldownEnabled: boolean, globalCooldown: number | null, shouldSkipRequestQueue: boolean, associatedRedemption: string };

const ChannelPointRewards: React.FC<any> = (props: any) => {
    const [channelPointRewards, setChannelPointRewards] = useState([] as RowData[]);
    const [redemptions, setRedemptions] = useState<string[]>([]);
    const [selectedRedemption, setSelectedRedemption] = useState<string>();
    const [currentRewardForAction, setCurrentRewardForAction] = useState<RowData>();
    const [openDeleteDialog, setOpenDeleteDialog] = useState<boolean>(false);

    //TODO: Might be better to do this on the server instead of here. First API call gets all rewards from the Twitch API
    // Second API call gets the saved redemptions from the database and adds the data to the other results.
    useEffect(() => {
        axios.get("api/twitch/channelrewards").then((result) => {
            let results = result.data;
            axios.get("api/twitch/channelrewards/associations").then((savedChannelPointRewards) => {
                results = results.map((result: any) => {
                    const foundReward = savedChannelPointRewards.data.find((channelPointReward: any) => channelPointReward.twitchRewardId == result.id);
                    return {...result, associatedRedemption: foundReward?.associatedRedemption}
                });

                setChannelPointRewards(results);
            });            
        });
    }, []);

    useEffect(() => {
        axios.get("api/twitch/channelrewards/redemptions").then((result) => {
            setRedemptions(result.data);
            setSelectedRedemption(redemptions[0]);
        });
    }, []);

    const [popupAnchor, setPopupAnchor] = React.useState<HTMLButtonElement | undefined>(undefined);
    const open = Boolean(popupAnchor);

    const handleRedemptionChange = (event: any) => {
        setSelectedRedemption(event.target.value);
    };

    const openRedemptionPopup = (button: HTMLButtonElement, channelPointReward: RowData) => {
        setPopupAnchor(button);
        setCurrentRewardForAction(channelPointReward);
    };

    const saveRedemption = async () => {
        if (!currentRewardForAction || !selectedRedemption) {
            return;
        }

        const postData = {
            rewardEvent: currentRewardForAction,
            channelPointRedemption: selectedRedemption
        };

        const result = await axios.post("api/twitch/channelrewards/associations", postData);
        if (result.status === 200) {
            const newChannelPointRewards = [...channelPointRewards];
            const index = channelPointRewards.indexOf(currentRewardForAction);
            currentRewardForAction.associatedRedemption = selectedRedemption;
            newChannelPointRewards.splice(index, 1, currentRewardForAction);
            setChannelPointRewards(newChannelPointRewards);
        }
        setPopupAnchor(undefined);
    };

    const openDeletePopup = (channelPointReward: RowData) => {
        setCurrentRewardForAction(channelPointReward);
        setOpenDeleteDialog(true);
    }

    const handleCloseDialog = () => {
        setCurrentRewardForAction(undefined);
        setOpenDeleteDialog(false);
    }

    const deleteRedemption = async (rewardToDelete: any) => {
        const result = await axios.delete(`api/twitch/channelrewards/associations?id=${rewardToDelete.id}`);
        if (result.status === 200) {
            const newChannelPointRewards = [...channelPointRewards];
            const index = channelPointRewards.indexOf(rewardToDelete);
            rewardToDelete.associatedRedemption = "";
            newChannelPointRewards.splice(index, 1, rewardToDelete);
            setChannelPointRewards(newChannelPointRewards);
        }
        handleCloseDialog();
    }

    return (
        <div>
            <Popover
            open = {open}
            anchorEl = {popupAnchor}
            onClose = {() => setPopupAnchor(undefined)}
            anchorOrigin = {{
                vertical: "bottom",
                horizontal: "center"
            }}>
                <Box py={1} px={2}>
                    <form>
                        <Grid container spacing={2} justify="flex-start" wrap={"nowrap"} alignItems="center">
                            <Grid item>
                                <TextField 
                                    select
                                    label="Set Redemption"
                                    id="set-redemption"
                                    value={selectedRedemption ?? "Please select a redemption for the channel point reward."}
                                    onChange={handleRedemptionChange}
                                    helperText="Please select the redemption for the Channel Point Reward."
                                >
                                    {redemptions.map((redemption) => (
                                        <MenuItem key={redemption} value={redemption}>{redemption}</MenuItem>
                                    ))}
                                </TextField>
                            </Grid>
                            <Grid item>
                                <Button 
                                    variant="contained" 
                                    color="primary" 
                                    startIcon={<Save />}
                                    onClick={() => saveRedemption()}
                                    >Save</Button>
                            </Grid>
                        </Grid>
                    </form>
                </Box>
            </Popover>
            <Dialog open={openDeleteDialog} onClose={handleCloseDialog}>
                <DialogTitle>Do you want to delete the redemption from this Channel Point Reward?</DialogTitle>
                <DialogContent>
                    <DialogContentText>This will stop the redemption from working when this Channel Point Reward is redeemed on Twitch.tv.</DialogContentText>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => deleteRedemption(currentRewardForAction)} color="primary">Delete</Button>
                    <Button onClick={() => handleCloseDialog()} color="secondary">Cancel</Button>
                </DialogActions>
            </Dialog>
            <MaterialTable
                title = {"Channel Point Rewards"}
                columns = {[
                    { title: "Channel Point Reward Title", field: "title" },
                    { title: "Cost", field: "cost" },
                    { title: "Redemption", field: "associatedRedemption" }
                ]}
                options = {{
                    paging: true,
                    showTitle: true,
                    actionsColumnIndex: 3,
                    pageSize: 10,
                    pageSizeOptions: [10, 50, 100, 200]
                }}
                actions = {[
                    {
                        tooltip: "Add Redemption",
                        icon: Add,
                        onClick: (event, rowData) => {
                            openRedemptionPopup(event.currentTarget, rowData as RowData);
                        }
                    },
                    {
                        tooltip: "Delete",
                        icon: Delete,
                        onClick: (event, rowData) => {
                            openDeletePopup(rowData as RowData);
                        }
                    }
                ]}
                data = {channelPointRewards}
                editable = {{
                    isEditable: rowData => false,
                    isDeletable: rowData => false
                }}>

            </MaterialTable>
        </div>
    );
};

export default ChannelPointRewards;