import { getResponse } from "../query/query-graph";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  try {
    const response = await getResponse([], "What is 3824 + 69742");
    // const readable = new ReadableStream({
    //   start(controller) {
    //     controller.enqueue(new TextEncoder().encode("Sourav"));
    //     controller.enqueue(new TextEncoder().encode("Goyal"));
    //     // controller.enqueue("Goyal");
    //     controller.close();
    //   },
    // });
    // const reader = readable.getReader();
    // while (true) {
    //   const { done, value } = await reader.read();
    //   if (done) break;
    //   console.log(new TextDecoder().decode(value));
    // }
    return NextResponse.json({ msg: response }, { status: 200 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ msg: "hello" }, { status: 200 });
  }
}
