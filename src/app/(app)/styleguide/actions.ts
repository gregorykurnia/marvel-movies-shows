"use server";

// Demo target for the DangerZone on /styleguide. Does nothing on purpose; the styleguide never changes data.
export async function demoConfirmAction(formData: FormData) {
  void formData;
}
