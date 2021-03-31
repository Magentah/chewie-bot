import React, { useEffect, useState } from "react";
import { makeStyles } from "@material-ui/core/styles";
import axios from "axios";
import MaterialTable from "material-table"
import { Button,  Grid, TextField, Popover, Box, CircularProgress } from "@material-ui/core";
import { Star } from "@material-ui/icons";
import { AddToListState } from "../common/addToListState";
import AddIcon from "@material-ui/icons/Add";

type RowData = { username: string, vipExpiry: number, vipLastRequest: number };
type UserLevel = { id: number; name: string; }

const useStyles = makeStyles((theme) => ({
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

    return (
        <div>
            {vipInfo}<br />
            {lastRequest}
        </div>
    );
};

const UserList: React.FC<any> = (props: any) => {
    const [userlist, setUserlist] = useState([] as RowData[]);
    const [userLevels, setUserLevels] = useState([] as UserLevel[]);

    const classes = useStyles();

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
    const [addVipWeeksAmount, setAddVipWeeksAmount] = useState<number>(0);
    const [addVipUser, setAddVipUser] = useState<RowData>();

    const submitVipGold = async () => {
        try {
            if (!addVipUser) {
                return;
            }

            setAddVipState({state: "progress"});

            const result = await axios.post(`/api/userlist/addVip/${addVipUser.username}`, { amount: addVipWeeksAmount }, { validateStatus: (status) => true });
            if (result.status === 200) {
                setAddVipState({state: "success"});
                const newUserlist = [...userlist];
                const index = userlist.indexOf(addVipUser);
                newUserlist.splice(index, 1, result.data as RowData);
                setUserlist(newUserlist);

                setAddVipWeeksAmount(0);
            } else {
                setAddVipState({
                    state: "failed",
                    message: result.data.error.message
                });
            }

            setPopupAnchor(undefined);
        } catch (error) {
            setAddVipState({
                state: "failed",
                message: error.message
            });
        }
    };

    const [popupAnchor, setPopupAnchor] = React.useState<HTMLButtonElement | undefined>(undefined);
    const openVipPopup = (button: HTMLButtonElement, user: RowData) => {
      setPopupAnchor(button);
      setAddVipUser(user);
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
                        <form onSubmit={submitVipGold}>
                            <Grid container spacing={2} justify="flex-start" wrap={"nowrap"} alignItems="center">
                                <Grid item xs={8}>
                                    <TextField
                                        label="Add gold VIP weeks"
                                        id="add-vip-weeks"
                                        type="number"
                                        inputProps={{style: { textAlign: "right" }}}
                                        fullWidth
                                        value={addVipWeeksAmount}
                                        onChange={(e) => setAddVipWeeksAmount(parseInt(e.target.value, 10))}
                                    />
                                </Grid>
                                <Grid item xs={3}>
                                    <Button
                                        variant="contained"
                                        color="primary"
                                        startIcon={addVipState?.state === "progress" ? <CircularProgress size={15} /> : <AddIcon />}
                                        onClick={submitVipGold}
                                        className={classes.addButton}
                                        disabled={addVipState?.state === "progress"}>
                                        Add
                                    </Button>
                                </Grid>
                            </Grid>
                        </form>
                    </Box>
            </Popover>
            <MaterialTable
                columns = {[
                    { title: "User name", field: "username" },
                    { title: "User level", field: "userLevelKey", lookup: Object.fromEntries(userLevels.map(e => [e.id, e.name])) },
                    {
                        title: "VIP status",
                        field: "vipExpiry",
                        render: rowData => VipStatusCell(rowData)
                    },
                    { title: "Points", field: "points", cellStyle: { textAlign: "right" }, headerStyle: { textAlign: "right" } }
                ]}
                options = {{
                    paging: true,
                    actionsColumnIndex: 4,
                    showTitle: false,
                    pageSize: userlist?.length > 10 ? 50 : 10,
                    pageSizeOptions: [10, 50, 100, 200]
                }}
                actions={[
                    {
                      icon: Star,
                      tooltip: "Add VIP gold",
                      onClick: (event, rowData) => {
                        if ((rowData as RowData).username !== undefined) {
                            openVipPopup(event.currentTarget, rowData as RowData);
                        }
                      }
                    }
                ]}
                data = {userlist}
                editable = {
                    {
                        // Allow edit when user levels are loaded.
                        isEditable: rowData => userLevels.length > 0,
                        isDeletable: rowData => true,
                        onRowUpdate: (newData, oldData) => axios.post("/api/userlist", newData).then((result) => {
                            if (result.status === 200) {
                                const newUserlist = [...userlist];
                                // @ts-ignore
                                const index = oldData?.tableData.id;
                                newUserlist[index] = newData;
                                setUserlist(newUserlist);
                            }
                        }),
                        onRowDelete: oldData => axios.post("/api/userlist/delete", oldData).then((result) => {
                            if (result.status === 200) {
                                const newUserlist = [...userlist];
                                // @ts-ignore
                                const index = oldData?.tableData.id;
                                newUserlist.splice(index, 1);
                                setUserlist(newUserlist);
                            }
                        })
                    }
                }
            />
        </div>
    );
};

export default UserList;