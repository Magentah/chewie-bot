import React from "react";
import { Card, CardContent, Box } from "@mui/material";
import SongQueue from "../../components/songqueue/SongQueue";
import SongPlayer from "../../components/songqueue/SongPlayer";

class MusicRequestView extends React.Component {
    private songPlayerRef: React.RefObject<SongPlayer>;

    constructor(props: any) {
        super(props);
        this.songPlayerRef = React.createRef();
    }

    playSong(id: string) {
        this.songPlayerRef.current?.playSong(id);
    }

    render() {
        return (
        <Box>
            <Card>
                <CardContent>
                    <SongQueue onPlaySong={(id: string) => this.playSong(id)} />
                </CardContent>
            </Card>
            <SongPlayer ref={this.songPlayerRef} />
        </Box>)
    };
};

export default MusicRequestView;
