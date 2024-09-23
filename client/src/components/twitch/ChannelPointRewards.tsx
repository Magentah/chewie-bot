import React, { useEffect, useState } from "react";
import axios from "axios";
import MaterialTable from "@material-table/core";

type RowData = {
    twitchRewardId: number, title: string, cost: number, isEnabled: boolean, 
    isGlobalCooldownEnabled: boolean, globalCooldown: number | null, shouldSkipRequestQueue: boolean,
    associatedRedemption: string, hasOwnership: boolean; arguments?: string
};

const ChannelPointRewards: React.FC<any> = (props: any) => {
    const [channelPointRewards, setChannelPointRewards] = useState([] as RowData[]);
    const [redemptions, setRedemptions] = useState<string[]>([]);

    useEffect(() => {
        axios.get("/api/twitch/channelrewards").then((result) => {
            setChannelPointRewards(result.data);
        });
    }, []);

    useEffect(() => {
        axios.get("/api/twitch/channelrewards/redemptions").then((result) => {
            setRedemptions(result.data);
        });
    }, []);

    return (
        <div>
            <MaterialTable
                title = {"Channel Point Rewards"}
                columns = {[
                    { title: "Channel Point Reward Title", field: "title", editable: "onAdd" },
                    { title: "Cost", field: "cost", editable: "onAdd" },
                    { title: "Redemption", field: "associatedRedemption", lookup: Object.fromEntries(redemptions.map(x => [x, x])), editable: "always", initialEditValue: "None" },
                    { title: "Arguments", field: "arguments", editable: "always", initialEditValue: "" },
                    { title: "Controlled", field: "hasOwnership", editable: "never", type: "boolean" },
                ]}
                options = {{
                    paging: false,
                    showTitle: true,
                    actionsColumnIndex: 5
                }}
                data = {channelPointRewards}
                editable = {{
                    isEditable: rowData => true,
                    isDeletable: rowData => false,
                    onRowAdd: (newData) => axios.post("/api/twitch/channelrewards", newData).then((result) => {
                        const newList = [...channelPointRewards, result.data as RowData];
                        setChannelPointRewards(newList);
                    }),
                    onRowUpdate: (newData, oldData) => {
                        const postData = {
                            rewardEvent: oldData,
                            channelPointRedemption: newData.associatedRedemption,
                            arguments: newData.arguments
                        };
                        return axios.post("/api/twitch/channelrewards/associations", postData).then((result) => {
                            const newList = [...channelPointRewards];
                            const target = newList.find((el) => el.twitchRewardId === oldData?.twitchRewardId);
                            if (target) {
                                const index = newList.indexOf(target);
                                newList[index] = newData;
                                setChannelPointRewards([...newList]);
                            }
                        });
                    },
                }} />
        </div>
    );
};

export default ChannelPointRewards;