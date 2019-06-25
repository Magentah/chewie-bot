import { OK, BAD_REQUEST } from 'http-status-codes';
import { Controller, Get } from '@overnightjs/core';
import { Logger } from '@overnightjs/logger';
import { Request, Response } from 'express';

@Controller('api/test')
class TestController {
    public static readonly SUCCESS_MESSAGE = 'success message: ';

    @Get(':message')
    private sayMessage(req: Request, res: Response) {
        try {
            const { message } = req.params;
            if (message === 'make_it_fail') {
                throw Error('Triggered error.');
            }

            Logger.Info(TestController.SUCCESS_MESSAGE + message);
            return res.status(OK).json({
                message: TestController.SUCCESS_MESSAGE + message,
            });
        } catch (err) {
            Logger.Err(err, true);
            return res.status(BAD_REQUEST).json({
                message: err.message,
            });
        }
    }
}

export default TestController;
