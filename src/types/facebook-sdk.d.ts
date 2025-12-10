
declare module 'facebook-nodejs-business-sdk' {
    export class Content {
        constructor();
    }
    export class CustomData {
        constructor();
        setValue(value: number): CustomData;
        setCurrency(currency: string): CustomData;
        setContentName(name: string): CustomData;
    }
    export class UserData {
        constructor();
        setFbc(fbc: string | null | undefined): UserData;
        setFbp(fbp: string | null | undefined): UserData;
        setClientUserAgent(agent: string | undefined): UserData;
        setClientIpAddress(ip: string | undefined): UserData;
        setExternalId(id: string | undefined): UserData;
    }
    export class ServerEvent {
        constructor();
        setEventName(name: string): ServerEvent;
        setEventTime(time: number): ServerEvent;
        setUserData(data: UserData): ServerEvent;
        setCustomData(data: CustomData): ServerEvent;
        setActionSource(source: string): ServerEvent;
    }
    export class EventRequest {
        constructor(accessToken: string, pixelId: string);
        setEvents(events: ServerEvent[]): EventRequest;
        execute(): Promise<any>;
    }
    export class DeliveryCategory { }
}
