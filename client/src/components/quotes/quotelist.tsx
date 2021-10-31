import React, { useEffect, useState } from "react";
import axios from "axios";
import MaterialTable from "@material-table/core";

const DateCell: React.FC<any> = (date: number) => {
    return (
        <span>
            {date ? new Intl.DateTimeFormat("en", { day: "2-digit", year: "numeric", month: "short" }).format(new Date(date)): "-"}
        </span>
    );
};

const QuoteList: React.FC<any> = (props: any) => {
    type RowData = { id?: number, text: string, author: string, dateAdded: number; addedByUserName: string };

    const [quotelist, setQuotelist] = useState([] as RowData[]);

    useEffect(() => {
        axios.get("/api/quotes").then((response) => {
            setQuotelist(response.data);
        });
    }, []);

    return <div>
            <MaterialTable
                columns = {[
                    { title: "ID", field: "id", type: "numeric", editable: "never", width: "5em" },
                    { title: "Quote", field: "text", width: "50%" },
                    { title: "Author", field: "author", width: "20em" },
                    { title: "Added by user", field: "addedByUserName", width: "25em" },
                    { title: "Creation", field: "dateAdded", type: "date", render: rowData => DateCell(rowData.dateAdded), width: "20em" }
                ]}
                options = {{
                    paging: true,
                    actionsColumnIndex: 5,
                    pageSize: 50,
                    pageSizeOptions: [50, 100, 200],
                    showTitle: false,
                    addRowPosition: "first"
                }}
                data = {quotelist}
                editable = {
                    {
                        isEditable: rowData => true,
                        isDeletable: rowData => true,
                        onRowAdd: (newData) => axios.post("/api/quotes", newData).then((result) => {
                            const newList = [...quotelist, result.data as RowData];
                            setQuotelist(newList);
                        }),
                        onRowUpdate: (newData, oldData) => axios.post("/api/quotes", newData).then((result) => {
                            const newList = [...quotelist];

                            // @ts-ignore
                            const target = newList.find((el) => el.id === oldData.tableData.id);
                            if (target) {
                                const index = newList.indexOf(target);
                                newList[index] = newData;
                                setQuotelist([...newList]);
                            }
                        }),
                        onRowDelete: oldData => axios.post("/api/quotes/delete", oldData).then((result) => {
                            const newList = [...quotelist];
                            // @ts-ignore
                            const target = newList.find((el) => el.id === oldData.tableData.id);
                            if (target) {
                                const index = newList.indexOf(target);
                                newList.splice(index, 1);
                                setQuotelist([...newList]);
                            }
                        })
                    }
                }
            />
    </div>;
};

export default QuoteList;