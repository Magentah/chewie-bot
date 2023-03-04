import React, { useContext, useEffect, useState } from "react";
import { makeStyles } from "tss-react/mui";
import axios from "axios";
import MaterialTable from "@material-table/core";
import { Button,  Grid, TextField, Popover, Box, CircularProgress, Typography, Dialog, DialogTitle, DialogContent, DialogActions, DialogContentText, Theme } from "@mui/material";
import { Star, SettingsBackupRestore } from "@mui/icons-material";
import { AddToListState } from "../common/addToListState";
import { UserLevel, UserLevels } from "../common/userLevel";
import AddIcon from "@mui/icons-material/Add";
import UserStatusLog from "./userStatusLog";
import { UserProfile } from "../common/userProfile";
import { UserContext  } from "../../contexts/userContext";

type RowData = { username: string, vipExpiry: number, vipLastRequest: number, vipPermanentRequests: number; };

const useStyles = makeStyles()((theme: Theme) => ({
    addButton: {
        margin: theme.spacing(2, 0, 2),
    }
}));

const VipStatusCell: React.FC<any> = (value: RowData) => {
    const todayDate = new Date(new Date().toDateString());
    let vipInfo = "";
    let lastRequest = "";
    if (value.vipExpiry) {
        if (new Date(value.vipExpiry) < todayDate) {
            vipInfo = "Expired: " + new Intl.DateTimeFormat("en", { day: "2-digit", year: "numeric", month: "short" }).format(new Date(value.vipExpiry));
        } else {
            vipInfo = "Expiry: " + new Intl.DateTimeFormat("en", { day: "2-digit", year: "numeric", month: "short" }).format(new Date(value.vipExpiry));
        }

        lastRequest = "Last request: " + (value?.vipLastRequest ? new Date(value?.vipLastRequest).toDateString() : "-");
    }

    if (value.vipPermanentRequests) {
        vipInfo += `, ${value.vipPermanentRequests} non-expiring request`;
    }

    return (
        <div>
            {vipInfo}<br />
            {lastRequest}
        </div>
    );
};

const UserDetailsPanel: React.FC<any> = (props: any) => {
    const [fullUserProfile, setFullUserProfile] = useState<UserProfile>();

    useEffect(() => {
        axios.get(`/api/userlist/profile/${props.username}`).then((response) => {
            if (response) {
                setFullUserProfile(response.data);
            }
        });
    }, [props.username]);

    return fullUserProfile ? <UserStatusLog profile={fullUserProfile} /> : <Box m={2}><Typography>Loading...</Typography></Box>;
}

const UserList: React.FC<any> = (props: any) => {
    const [userlist, setUserlist] = useState([] as RowData[]);
    const [userLevels, setUserLevels] = useState([] as UserLevel[]);
    const userContext = useContext(UserContext);
    const [currentUserForAction, setCurrentUserForAction] = useState<RowData>();

    const [resetDialogOpen, setResetDialogOpen] = useState(false);

    const handleClickOpenReset = (userData: RowData) => {
        setCurrentUserForAction(userData);
        setResetDialogOpen(true);
    };

    const handleCloseReset = (resetUser: boolean) => {
        setResetDialogOpen(false);

        if (resetUser && currentUserForAction) {
            axios.post("/api/userlist/delete", currentUserForAction).then((result) => {
                if (result.status === 200) {
                    const newUserlist = [...userlist];
                    const index = userlist.indexOf(currentUserForAction);
                    newUserlist.splice(index, 1, result.data as RowData);
                    setUserlist(newUserlist);
                }
            })
        }
    };

    const { classes } = useStyles();

    useEffect(() => {
        axios.get("/api/userlist").then((response) => {
            setUserlist(response.data);
        });
    }, []);

    useEffect(() => {
        axios.get("/api/userLevels").then((response) => {
            setUserLevels(response.data);
        });
    }, []);

    const [addVipState, setAddVipState] = useState<AddToListState>();
    const [addVipAmount, setAddVipAmount] = useState<number>(0);
    const [addVipType, setAddVipType] = useState<"weeks"|"permanent">("weeks");

    const submitVipGold = async (useWeeks: boolean) => {
        try {
            if (!currentUserForAction) {
                return;
            }

            setAddVipState({state: "progress"});
            setAddVipType(useWeeks ? "weeks" : "permanent");

            const data = useWeeks ? { weeks: addVipAmount } : { amount: addVipAmount };
            const result = await axios.post(`/api/userlist/addVip/${currentUserForAction.username}`, data);
            setAddVipState({state: "success"});
            const newUserlist = [...userlist];
            const index = userlist.indexOf(currentUserForAction);
            newUserlist.splice(index, 1, result.data as RowData);
            setUserlist(newUserlist);

            setAddVipAmount(0);
            setPopupAnchor(undefined);
        } catch (error: any) {
            setAddVipState({
                state: "failed",
                message: error.message
            });
        }
    };

    const [popupAnchor, setPopupAnchor] = React.useState<HTMLButtonElement | undefined>(undefined);
    const openVipPopup = (button: HTMLButtonElement, userData: RowData) => {
      setPopupAnchor(button);
      setCurrentUserForAction(userData);
    };

    const open = Boolean(popupAnchor);

    return (
        <div>
            <Popover
                    open={open}
                    anchorEl={popupAnchor}
                    onClose={() => setPopupAnchor(undefined)}
                    anchorOrigin={{
                        vertical: "bottom",
                        horizontal: "center",
                    }}>
                    <Box py={1} px={2}>
                        <form>
                            <Grid container spacing={2} justifyContent="flex-start" wrap={"nowrap"} alignItems="center">
                                <Grid item>
                                    <TextField
                                        label="Add gold VIP"
                                        id="add-vip-weeks"
                                        type="number"
                                        inputProps={{style: { textAlign: "right" }}}
                                        fullWidth
                                        value={addVipAmount}
                                        onChange={(e) => setAddVipAmount(parseInt(e.target.value, 10))}
                                    />
                                </Grid>
                                <Grid item>
                                    <Button
                                        variant="contained"
                                        color="primary"
                                        startIcon={addVipState?.state === "progress" && addVipType === "weeks" ? <CircularProgress size={15} /> : <AddIcon />}
                                        onClick={() => submitVipGold(true)}
                                        className={classes.addButton}
                                        disabled={addVipState?.state === "progress" || addVipAmount === 0}>
                                        Add weeks
                                    </Button>
                                </Grid>
                                <Grid item>
                                    <Button
                                        variant="contained"
                                        color="primary"
                                        startIcon={addVipState?.state === "progress" && addVipType === "permanent" ? <CircularProgress size={15} /> : <AddIcon />}
                                        onClick={() => submitVipGold(false)}
                                        className={classes.addButton}
                                        disabled={addVipState?.state === "progress" || addVipAmount === 0}>
                                        Add requests
                                    </Button>
                                </Grid>
                            </Grid>
                        </form>
                    </Box>
            </Popover>
            <Dialog open={resetDialogOpen} onClose={handleCloseReset}>
                <DialogTitle>Do you want to reset the user's data?</DialogTitle>
                <DialogContent>
                    <DialogContentText>This will reset the user's points, delete the history of point changes, and remove the VIP gold status.</DialogContentText>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => handleCloseReset(true)} color="primary" autoFocus>Reset</Button>
                    <Button onClick={() => handleCloseReset(false)} color="primary">Cancel</Button>
                </DialogActions>
            </Dialog>
            <MaterialTable
                columns = {[
                    { title: "User name", field: "username" },
                    {
                        title: "User level",
                        field: "userLevel",
                        lookup: Object.fromEntries(userLevels.map(e => [e.rank, e.name])),
                        editable: userContext.user.userLevel >= UserLevels.Admin ? "always" : "never"
                    },
                    {
                        title: "VIP status",
                        field: "vipExpiry",
                        editable: "never",
                        render: rowData => VipStatusCell(rowData)
                    },
                    { title: "Points", field: "points", cellStyle: { textAlign: "right" }, headerStyle: { textAlign: "right" } }
                ]}
                options = {{
                    paging: true,
                    actionsColumnIndex: 4,
                    showTitle: false,
                    pageSize: userlist?.length > 10 ? 50 : 10,
                    pageSizeOptions: [10, 50, 100, 200],
                    padding: "dense"
                }}
                actions={userContext.user.userLevel < UserLevels.Broadcaster ? undefined : [
                    {
                        icon: Star,
                        tooltip: "Add VIP gold",
                        onClick: (event, rowData) => {
                            if ((rowData as RowData).username !== undefined) {
                                openVipPopup(event.currentTarget, rowData as RowData);
                            }
                        }
                    },
                    {
                        icon: SettingsBackupRestore,
                        tooltip: "Reset user",
                        onClick: (event, rowData) => {
                            if ((rowData as RowData).username !== undefined) {
                                handleClickOpenReset(rowData as RowData);
                            }
                        }
                    },
                ]}
                data = {userlist}
                editable = {
                    {
                        // Allow edit when user levels are loaded.
                        isEditable: rowData => userLevels.length > 0,
                        isDeletable: rowData => true,
                        onRowUpdate: (newData, oldData) => axios.post("/api/userlist", newData).then((result) => {
                            const newList = [...userlist];
                            // @ts-ignore
                            const target = newList.find((el) => el.id === oldData.tableData.id);
                            if (target) {
                                const index = newList.indexOf(target);
                                newList[index] = newData;
                                setUserlist([...newList]);
                            }
                        })
                    }
                }
                detailPanel = {[
                    {
                      render: ({ rowData }) => <UserDetailsPanel username={rowData.username} />
                    }
                ]}
            />
        </div>
    );
};

export default UserList;