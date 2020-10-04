export default interface IDonation {
    id?: number;
    username: string;
    date: Date;
    type: string;
    message?: string;
    amount: number;
}
