import React, { useEffect, useState } from "react";
import axios from "axios";
import MaterialTable from "@material-table/core";

type RowData = { twitchRewardId: number, title: string, cost: number, isEnabled: boolean, isGlobalCooldownEnabled: boolean, globalCooldown: number | null, shouldSkipRequestQueue: boolean, associatedRedemption: string };

const ChannelPointRewards: React.FC<any> = (props: any) => {
    const [channelPointRewards, setChannelPointRewards] = useState([] as RowData[]);
    const [redemptions, setRedemptions] = useState<string[]>([]);

    // TODO: Might be better to do this on the server instead of here. First API call gets all rewards from the Twitch API
    // Second API call gets the saved redemptions from the database and adds the data to the other results.
    useEffect(() => {
        axios.get("/api/twitch/channelrewards").then((result) => {
            let results = result.data;
            axios.get("/api/twitch/channelrewards/associations").then((savedChannelPointRewards) => {
                results = results.map((res: any) => {
                    const foundReward = savedChannelPointRewards.data.find((channelPointReward: any) => channelPointReward.twitchRewardId === res.id);
                    return {...res, associatedRedemption: foundReward?.associatedRedemption ?? "None"}
                });

                setChannelPointRewards(results);
            });
        });
    }, []);

    useEffect(() => {
        axios.get("/api/twitch/channelrewards/redemptions").then((result) => {
            setRedemptions(result.data);
        });
    }, [redemptions]);

    return (
        <div>
            <MaterialTable
                title = {"Channel Point Rewards"}
                columns = {[
                    { title: "Channel Point Reward Title", field: "title", editable: "never" },
                    { title: "Cost", field: "cost", editable: "never" },
                    { title: "Redemption", field: "associatedRedemption", lookup: Object.fromEntries(redemptions.map(x => [x, x])), editable: "always" }
                ]}
                options = {{
                    paging: false,
                    showTitle: true,
                    actionsColumnIndex: 3
                }}
                data = {channelPointRewards}
                editable = {{
                    isEditable: rowData => true,
                    isDeletable: rowData => false,
                    onRowUpdate: (newData, oldData) => {
                        const postData = {
                            rewardEvent: oldData,
                            channelPointRedemption: newData.associatedRedemption
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
                }}>

            </MaterialTable>
        </div>
    );
};

export default ChannelPointRewards;