import React from "react";
import { Card, CardContent, Box } from "@material-ui/core";
import SongQueue from "../../components/songqueue/SongQueue";

const MusicRequestView: React.FC<{}> = (props) => {
  return (
    <Box width={1000}>
      <Card>
        <CardContent>
          <SongQueue />
        </CardContent>
      </Card>
    </Box>
  );
};

export default MusicRequestView;
