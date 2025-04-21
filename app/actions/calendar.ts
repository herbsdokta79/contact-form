"use server"

import { google } from "googleapis"
import { z } from "zod"

const formSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  subject: z.string().min(5),
  message: z.string().min(10),
  eventDate: z.string(),
  eventTime: z.string(),
})

export async function createCalendarEvent(formData: FormData) {
  try {
    const data = {
      name: formData.get("name")?.toString() || "",
      email: formData.get("email")?.toString() || "",
      subject: formData.get("subject")?.toString() || "",
      message: formData.get("message")?.toString() || "",
      eventDate: formData.get("eventDate")?.toString() || "",
      eventTime: formData.get("eventTime")?.toString() || "",
    }

    // Log for debugging
    if (process.env.NODE_ENV === "development") {
      console.log("Received form data:", data)
    }

    const validatedData = formSchema.parse(data)

    const jwtClient = new google.auth.JWT(
      process.env.GOOGLE_CLIENT_EMAIL,
      undefined,
      process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
      ["https://www.googleapis.com/auth/calendar"]
    )

    const calendar = google.calendar({ version: "v3", auth: jwtClient })

    const eventDateTime = new Date(`${validatedData.eventDate}T${validatedData.eventTime}`)
    const endDateTime = new Date(eventDateTime.getTime() + 60 * 60 * 1000)

    const event = {
      summary: validatedData.subject,
      description: `From: ${validatedData.name} (${validatedData.email})\n\n${validatedData.message}`,
      start: {
        dateTime: eventDateTime.toISOString(),
        timeZone: "UTC",
      },
      end: {
        dateTime: endDateTime.toISOString(),
        timeZone: "UTC",
      },
      attendees: [{ email: validatedData.email }],
    }

    const response = await calendar.events.insert({
      calendarId: "primary",
      requestBody: event,
      sendUpdates: "all",
    })

    return {
      success: true,
      message: "Appointment booked successfully!",
      eventId: response.data.id,
    }
  } catch (error) {
    console.error("Error creating calendar event:", error)
    return {
      success: false,
      message: "Failed to book appointment. Please try again.",
    }
  }
}
