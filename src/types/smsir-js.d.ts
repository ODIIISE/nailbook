declare module "smsir-js" {
  export class Smsir {
    constructor(apiKey: string, lineNumber: number);
    SendVerifyCode(mobile: string, templateId: number, code: string): Promise<any>;
    SendBulk(lineNumber: number, message: string, mobiles: string[]): Promise<any>;
    getCredit(): Promise<any>;
    getLineNumbers(): Promise<any>;
  }
}
