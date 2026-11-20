import type { BufferAttribute, InterleavedBufferAttribute } from "three";
/** Read normalized glTF attributes through accessors, never raw integer storage. */
export function linearVertexColors(
  attribute: BufferAttribute | InterleavedBufferAttribute,
) {
  const colors = new Float32Array(attribute.count * 3);
  for (let i = 0; i < attribute.count; i++)
    colors.set(
      [attribute.getX(i), attribute.getY(i), attribute.getZ(i)],
      i * 3,
    );
  return colors;
}
