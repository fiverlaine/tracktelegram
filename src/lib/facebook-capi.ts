
import { Content, CustomData, DeliveryCategory, EventRequest, UserData, ServerEvent } from 'facebook-nodejs-business-sdk';

/**
 * Sends a server-side event to Facebook CAPI
 */
export async function sendCAPIEvent(
    accessToken: string,
    pixelId: string,
    eventName: string,
    userDataPayload: {
        fbc?: string | null;
        fbp?: string | null;
        user_agent?: string;
        email?: string; // hash if passed, but usually we don't have it yet for Telegram flow
        ip_address?: string;
        external_id?: string;
    },
    customDataPayload?: {
        currency?: string;
        value?: number;
        content_name?: string;
    }
) {
    if (!accessToken || !pixelId) {
        console.warn('CAPI: Missing Access Token or Pixel ID');
        return;
    }

    const currentTimestamp = Math.floor(new Date().getTime() / 1000);

    const userData = new UserData()
        .setFbc(userDataPayload.fbc)
        .setFbp(userDataPayload.fbp)
        .setClientUserAgent(userDataPayload.user_agent)
        .setClientIpAddress(userDataPayload.ip_address)
        .setExternalId(userDataPayload.external_id);

    const content = new Content();

    const customData = new CustomData();
    if (customDataPayload?.value) customData.setValue(customDataPayload.value);
    if (customDataPayload?.currency) customData.setCurrency(customDataPayload.currency);
    if (customDataPayload?.content_name) customData.setContentName(customDataPayload.content_name);

    const serverEvent = new ServerEvent()
        .setEventName(eventName)
        .setEventTime(currentTimestamp)
        .setUserData(userData)
        .setCustomData(customData)
        .setActionSource('website');

    const eventRequest = new EventRequest(accessToken, pixelId)
        .setEvents([serverEvent]);

    try {
        const response = await eventRequest.execute();
        console.log('CAPI Success:', response);
        return response;
    } catch (error) {
        console.error('CAPI Error:', error);
        throw error;
    }
}
