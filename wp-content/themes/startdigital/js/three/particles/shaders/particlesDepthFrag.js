export default /*glsl*/ `
#include <packing>

varying vec2 vHighPrecisionZW;

void main() {
    // Discard pixels outside circle
    vec2 center = gl_PointCoord - 0.5;
    if (length(center) > 0.5) discard;

    float fragCoordZ = 0.5 * vHighPrecisionZW.x / vHighPrecisionZW.y + 0.5;
    gl_FragColor = packDepthToRGBA( fragCoordZ );
}
`
