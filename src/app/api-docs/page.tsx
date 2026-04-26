import { getApiSpec } from "@/lib/swagger";
import SwaggerUIComponent from "./SwaggerUI";

export default function ApiDocsPage() {
  const spec = getApiSpec();
  return <SwaggerUIComponent spec={spec} />;
}
