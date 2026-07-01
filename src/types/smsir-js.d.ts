declare module "smsir-js" {
  export class Smsir {
    constructor(apiKey: string, lineNumber: number);
    SendOTP(mobile: string, templateId: number, code: string): Promise<any>;
    SendBulk(lineNumber: number, message: string, mobiles: string[]): Promise<any>;
    GetCredit(): Promise<any>;
  }
}
