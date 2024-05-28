import { json, ActionFunctionArgs } from "@remix-run/node";
import OpenAI from "openai";
import { emitter } from "~/services/emitter.server";
import { getUserDetails, getUserProfile, fetchUserContractDetails } from "~/utils/queries.server";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function action({ request }: ActionFunctionArgs) {
  const formData = await request.formData();
  const messages = formData.get("messages") as string;
  const assistantID = formData.get("assistantID") as string;
  const vectorID = formData.get("vectorID") as string;
  console.log("assistantID " + assistantID);
  console.log("vectorID " + vectorID);

  let responseText = '';
  try {
    const user = await getUserProfile(request);
    const contractDetails = await getUserDetails(request);
    const userContractDetails = await fetchUserContractDetails(request);
    const thread = await openai.beta.threads.create();

    const userInfo = `User Info: 
    Name: ${user.firstName} ${user.lastName}, 
    Email: ${user.email}, 
    Bio: ${user.bio}, 
    Gender: ${user.gender}, 
    Birthday: ${user.birthday}
    Contract Details: 
    ${JSON.stringify(contractDetails)}
    User Contract Details: 
    ${JSON.stringify(userContractDetails)}
    `;
    console.log("userInfo " + userInfo);

    await openai.beta.threads.messages.create(thread.id, {
      role: "user",
      content: `${messages} \n\n${userInfo}`
    });

    const stream = openai.beta.threads.runs.stream(thread.id, { assistant_id: assistantID });

    for await (const event of stream) {
      if (event.data.object.toString() === 'thread.message.delta') {
        responseText += event.data.delta.content[0].text.value;

        emitter.emit("message", {
          id: thread.id,
          content: responseText,
          role: 'assistant'
        });
      }
    }

    return json({ response: responseText });

  } catch (error) {
    console.error('Error con OpenAI:', error);
    return json({ error: 'No se pudo obtener una respuesta.' }, { status: 500 });
  }
}
