declare var https: any;
declare var fs: any;
declare var express: any;
declare var expressWs: any;
declare var os: any;
declare var pty: any;
declare var options: {
    key: any;
    cert: any;
};
declare var app: any;
declare var server: any;
declare var expressWs: any;
declare var terminals: {}, logs: {}, broadcasts: {};
declare var lurkers: any[];
declare var port: any, host: string;
declare function unlock(pid: number): void;
