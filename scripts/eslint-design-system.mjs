// Keep screen UI aligned with DESIGN.md. Printed documents have physical sizing.
const consistentStyles = {
  meta: {
    type: "suggestion",
    schema: [],
    messages: {
      smallText: "Use text-xs (12px) or larger for screen text; see DESIGN.md.",
      radius: "Use rounded-lg for cards or rounded-xl for dialogs and chrome; see DESIGN.md.",
      title: "Use PageTitle for a visible page heading so its typography stays consistent.",
    },
  },
  create(context) {
    function checkText(node, value) {
      if (typeof value !== "string") return;
      if (/(?:^|[\s:])text-\[(?:[0-9]|1[01])(?:\.\d+)?px\]/.test(value)) {
        context.report({ node, messageId: "smallText" });
      }
      if (/(?:^|[\s:])rounded-(?:2xl|3xl)\b/.test(value)) {
        context.report({ node, messageId: "radius" });
      }
    }
    return {
      Literal(node) {
        checkText(node, node.value);
      },
      TemplateElement(node) {
        checkText(node, node.value.cooked);
      },
      JSXOpeningElement(node) {
        if (node.name.type !== "JSXIdentifier" || node.name.name !== "h1") return;
        const hidden = node.attributes.some((attribute) =>
          attribute.type === "JSXAttribute" && attribute.name.name === "className" &&
          attribute.value?.type === "Literal" &&
          typeof attribute.value.value === "string" &&
          attribute.value.value.split(/\s+/).includes("sr-only")
        );
        if (!hidden) context.report({ node, messageId: "title" });
      },
    };
  },
};

const designSystem = { rules: { "consistent-styles": consistentStyles } };
export default designSystem;
