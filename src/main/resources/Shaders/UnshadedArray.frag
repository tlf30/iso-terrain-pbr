#extension GL_EXT_texture_array : enable
// #extension GL_EXT_gpu_shader4 : enable

uniform vec4 m_Color;

in vec3 texCoord;
in vec3 worldNormal;

#if defined(HAS_GLOWMAP) || defined(HAS_COLORMAP) || (defined(HAS_LIGHTMAP) && !defined(SEPARATE_TEXCOORD))
    #define NEED_TEXCOORD8
#endif

#ifdef HAS_COLORMAP
    #if !defined(GL_EXT_texture_array)
        #error Texture arrays are not supported, but required.
    #endif

    uniform sampler2DArray m_ColorMap;
#endif

#ifdef NEED_TEXCOORD8
    in vec3 texCoord8;
    flat in float id;
#endif

#ifdef HAS_LIGHTMAP
    uniform sampler2D m_LightMap;
    #ifdef SEPERATE_TEXCOORD
        in vec3 texCoord2;
    #endif
#endif

#ifdef HAS_VERTEXCOLOR
    in vec4 vertColor;
#endif



void main(){
    vec4 color;
    #ifdef HAS_COLORMAP
        vec4 xColor = texture2DArray(m_ColorMap, vec3(texCoord.zy, id));
        vec4 yColor = texture2DArray(m_ColorMap, vec3(texCoord.xz, id));
        vec4 zColor = texture2DArray(m_ColorMap, vec3(texCoord.xy, id));
        
        vec3 blend = abs(normalize(worldNormal));
        blend /= (blend.x + blend.y + blend.z);

        color = xColor * blend.x
                        + yColor * blend.y
                        + zColor * blend.z;

        //float a = id + 1.0;
        //color = vec4(mod(a,1.0), mod(a, 2.0), mod(a, 3.0), 1.0);

            
    #endif

    #ifdef HAS_VERTEXCOLOR
        color *= vertColor;
    #endif

    #ifdef HAS_COLOR
        color *= m_Color;
    #endif

    #ifdef HAS_LIGHTMAP
        #ifdef SEPARATE_TEXCOORD
            color.rgb *= texture2D(m_LightMap, texCoord2).rgb;
        #else
            color.rgb *= texture2D(m_LightMap, texCoord1).rgb;
        #endif
    #endif

    gl_FragColor = color;
}