const uvCoverVert = /* glsl */ `
    vec2 getCoverUvVert(vec2 uv, vec2 textureSize, vec2 quadSize) {
        vec2 ratio = vec2(
            min((quadSize.x / quadSize.y) / (textureSize.x / textureSize.y), 1.0),
            min((quadSize.y / quadSize.x) / (textureSize.y / textureSize.x), 1.0)
        );

        return vec2(
            uv.x * ratio.x + (1.0 - ratio.x) * 0.5,
            uv.y * ratio.y + (1.0 - ratio.y) * 0.5
        );
    }

`

export default uvCoverVert
