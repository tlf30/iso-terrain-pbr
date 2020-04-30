#extension GL_EXT_texture_array : enable
#import "Common/ShaderLib/GLSLCompat.glsllib"
#import "Common/ShaderLib/PBR.glsllib"
#import "Common/ShaderLib/Parallax.glsllib"
#import "Common/ShaderLib/Lighting.glsllib"

varying vec3 texCoord;
varying vec3 worldNormal;
#ifdef SEPARATE_TEXCOORD
  varying vec2 texCoord2;
#endif

flat in float vid;

varying vec4 Color;

uniform vec4 g_LightData[NB_LIGHTS];
uniform vec3 g_CameraPosition;
uniform vec4 g_AmbientLightColor;

uniform float m_Roughness;
uniform float m_Metallic;

varying vec3 wPosition;


#if NB_PROBES >= 1
  uniform samplerCube g_PrefEnvMap;
  uniform vec3 g_ShCoeffs[9];
  uniform mat4 g_LightProbeData;
#endif
#if NB_PROBES >= 2
  uniform samplerCube g_PrefEnvMap2;
  uniform vec3 g_ShCoeffs2[9];
  uniform mat4 g_LightProbeData2;
#endif
#if NB_PROBES == 3
  uniform samplerCube g_PrefEnvMap3;
  uniform vec3 g_ShCoeffs3[9];
  uniform mat4 g_LightProbeData3;
#endif

#ifdef BASECOLORMAP
    #if !defined(GL_EXT_texture_array)
        #error Texture arrays are not supported, but required to use shader.
    #endif

    uniform sampler2DArray m_BaseColorMap;
#endif

#ifdef USE_PACKED_MR
  uniform sampler2DArray m_MetallicRoughnessMap;
#else
    #ifdef METALLICMAP
      uniform sampler2DArray m_MetallicMap;
    #endif
    #ifdef ROUGHNESSMAP
      uniform sampler2DArray m_RoughnessMap;
    #endif
#endif

#ifdef EMISSIVE
  uniform vec4 m_Emissive;
#endif
#ifdef EMISSIVEMAP
  uniform sampler2DArray m_EmissiveMap;
#endif
#if defined(EMISSIVE) || defined(EMISSIVEMAP)
    uniform float m_EmissivePower;
    uniform float m_EmissiveIntensity;
#endif

#ifdef SPECGLOSSPIPELINE

  uniform vec4 m_Specular;
  uniform float m_Glossiness;
  #ifdef USE_PACKED_SG
    uniform sampler2DArray m_SpecularGlossinessMap;
  #else
    uniform sampler2DArray m_SpecularMap;
    uniform sampler2DArray m_GlossinessMap;
  #endif
#endif

#ifdef PARALLAXMAP
  uniform sampler2DArray m_ParallaxMap;
#endif
#if (defined(PARALLAXMAP) || (defined(NORMALMAP_PARALLAX) && defined(NORMALMAP)))
    uniform float m_ParallaxHeight;
#endif

#ifdef LIGHTMAP
  uniform sampler2DArray m_LightMap;
#endif

#if defined(NORMALMAP) || defined(PARALLAXMAP)
  uniform sampler2DArray m_NormalMap;
  varying vec4 wTangent;
#endif
varying vec3 wNormal;

#ifdef DISCARD_ALPHA
  uniform float m_AlphaDiscardThreshold;
#endif

void main(){
    vec3 newTexCoord;
    vec3 viewDir = normalize(g_CameraPosition - wPosition);

    vec3 blend = abs(normalize(worldNormal));
    blend /= (blend.x + blend.y + blend.z);

    vec3 norm = normalize(wNormal);
    #if defined(NORMALMAP) || defined(PARALLAXMAP)
        vec3 tan = normalize(wTangent.xyz);
        mat3 tbnMat = mat3(tan, wTangent.w * cross( (norm), (tan)), norm);
    #endif

    #ifdef BASECOLORMAP
        vec4 xalbedo = texture2DArray(m_BaseColorMap, vec3(texCoord.zy, vid));
        vec4 yalbedo = texture2DArray(m_BaseColorMap, vec3(texCoord.xz, vid));
        vec4 zalbedo = texture2DArray(m_BaseColorMap, vec3(texCoord.xy, vid));
        vec4 albedo = xalbedo * blend.x
            + yalbedo * blend.y
            + zalbedo * blend.z;
    #else
        vec4 albedo = Color;
    #endif

    #ifdef USE_PACKED_MR
        vec4 xrm = texture2DArray(m_MetallicRoughnessMap, vec3(texCoord.zy, vid));
        vec4 yrm = texture2DArray(m_MetallicRoughnessMap, vec3(texCoord.xz, vid));
        vec4 zrm = texture2DArray(m_MetallicRoughnessMap, vec3(texCoord.xy, vid));
        vec4 crm = xrm * blend.x
            + yrm * blend.y
            + zrm * blend.z;
        vec2 rm = crm.gb;
        float Roughness = rm.x * max(m_Roughness, 1e-4);
        float Metallic = rm.y * max(m_Metallic, 0.0);
    #else
        #ifdef ROUGHNESSMAP
            vec4 xRoughness = texture2DArray(m_RoughnessMap, vec3(texCoord.zy, vid));
            vec4 yRoughness = texture2DArray(m_RoughnessMap, vec3(texCoord.xz, vid));
            vec4 zRoughness = texture2DArray(m_RoughnessMap, vec3(texCoord.xy, vid));
            vec4 cRoughness = xRoughness * blend.x
                + yRoughness * blend.y
                + zRoughness * blend.z;
            float Roughness = cRoughness.r * max(m_Roughness, 1e-4);
        #else
            float Roughness =  max(m_Roughness, 1e-4);
        #endif
        #ifdef METALLICMAP
            vec4 xMetallic = texture2DArray(m_MetallicMap, vec3(texCoord.zy, vid));
            vec4 yMetallic = texture2DArray(m_MetallicMap, vec3(texCoord.xz, vid));
            vec4 zMetallic = texture2DArray(m_MetallicMap, vec3(texCoord.xy, vid));
            vec4 cMetallic = xMetallic * blend.x
                + yMetallic * blend.y
                + zMetallic * blend.z;
            float Metallic = cMetallic.r * max(m_Metallic, 0.0);
        #else
            float Metallic =  max(m_Metallic, 0.0);
        #endif
    #endif

    float alpha = albedo.a;

    #ifdef DISCARD_ALPHA
        if(alpha < m_AlphaDiscardThreshold){
            discard;
        }
    #endif

    // ***********************
    // Read from textures
    // ***********************
    #if defined(NORMALMAP)
        vec4 xnormalHeight = texture2DArray(m_NormalMap, vec3(texCoord.zy, vid));
        vec4 ynormalHeight = texture2DArray(m_NormalMap, vec3(texCoord.xz, vid));
        vec4 znormalHeight = texture2DArray(m_NormalMap, vec3(texCoord.xy, vid));
        vec4 normalHeight = xnormalHeight * blend.x
            + ynormalHeight * blend.y
            + znormalHeight * blend.z;

        //Note the -2.0 and -1.0. We invert the green channel of the normal map,
        //as it's complient with normal maps generated with blender.
        //see http://hub.jmonkeyengine.org/forum/topic/parallax-mapping-fundamental-bug/#post-256898
        //for more explanation.
        vec3 normal = normalize((normalHeight.xyz * vec3(2.0, NORMAL_TYPE * 2.0, 2.0) - vec3(1.0, NORMAL_TYPE * 1.0, 1.0)));
        normal = normalize(tbnMat * normal);
        //normal = normalize(normal * inverse(tbnMat));
    #else
      vec3 normal = norm;
    #endif

    #ifdef SPECGLOSSPIPELINE

        #ifdef USE_PACKED_SG
            vec4 xspecularColor = texture2DArray(m_SpecularGlossinessMap, vec3(texCoord.zy, vid));
            vec4 yspecularColor = texture2DArray(m_SpecularGlossinessMap, vec3(texCoord.xz, vid));
            vec4 zspecularColor = texture2DArray(m_SpecularGlossinessMap, vec3(texCoord.xy, vid));
            vec4 specularColor = xspecularColor * blend.x
                + yspecularColor * blend.y
                + zspecularColor * blend.z;

            float glossiness = specularColor.a * m_Glossiness;
            specularColor *= m_Specular;
        #else
            #ifdef SPECULARMAP
                vec4 xspecularColor = texture2DArray(m_SpecularGlossinessMap, vec3(texCoord.zy, vid));
                vec4 yspecularColor = texture2DArray(m_SpecularGlossinessMap, vec3(texCoord.xz, vid));
                vec4 zspecularColor = texture2DArray(m_SpecularGlossinessMap, vec3(texCoord.xy, vid));
                vec4 specularColor = xspecularColor * blend.x
                    + yspecularColor * blend.y
                    + zspecularColor * blend.z;
            #else
                vec4 specularColor = vec4(1.0);
            #endif
            #ifdef GLOSSINESSMAP
                vec4 xglossiness = texture2DArray(m_GlossinessMap, vec3(texCoord.zy, vid));
                vec4 yglossiness = texture2DArray(m_GlossinessMap, vec3(texCoord.xz, vid));
                vec4 zglossiness = texture2DArray(m_GlossinessMap, vec3(texCoord.xy, vid));
                vec4 cglossiness = xglossiness * blend.x
                    + yglossiness * blend.y
                    + zglossiness * blend.z;
                float glossiness = cglossiness.r * m_Glossiness;
            #else
                float glossiness = m_Glossiness;
            #endif
            specularColor *= m_Specular;
        #endif
        vec4 diffuseColor = albedo;// * (1.0 - max(max(specularColor.r, specularColor.g), specularColor.b));
        Roughness = 1.0 - glossiness;
        vec3 fZero = specularColor.xyz;
    #else
        float specular = 0.5;
        float nonMetalSpec = 0.08 * specular;
        vec4 specularColor = (nonMetalSpec - nonMetalSpec * Metallic) + albedo * Metallic;
        vec4 diffuseColor = albedo - albedo * Metallic;
        vec3 fZero = vec3(specular);
    #endif

    gl_FragColor.rgb = vec3(0.0);
    vec3 ao = vec3(1.0);

    #ifdef LIGHTMAP
       vec3 lightMapColor;
       #ifdef SEPARATE_TEXCOORD
          lightMapColor = texture(m_LightMap, vec3(texCoord2,vid)).rgb;
       #else
           vec4 xlightMapColor = texture2DArray(m_LightMap, vec3(texCoord.zy, vid));
           vec4 ylightMapColor = texture2DArray(m_LightMap, vec3(texCoord.xz, vid));
           vec4 zlightMapColor = texture2DArray(m_LightMap, vec3(texCoord.xy, vid));
           vec4 clightMapColor = xlightMapColor * blend.x
               + ylightMapColor * blend.y
               + zlightMapColor * blend.z;
          lightMapColor = clightMapColor.rgb;
       #endif
       #ifdef AO_MAP
         lightMapColor.gb = lightMapColor.rr;
         ao = lightMapColor;
       #else
         gl_FragColor.rgb += diffuseColor.rgb * lightMapColor;
       #endif
       specularColor.rgb *= lightMapColor;
    #endif


    float ndotv = max( dot( normal, viewDir ),0.0);
    for( int i = 0;i < NB_LIGHTS; i+=3){
        vec4 lightColor = g_LightData[i];
        vec4 lightData1 = g_LightData[i+1];
        vec4 lightDir;
        vec3 lightVec;
        lightComputeDir(wPosition, lightColor.w, lightData1, lightDir, lightVec);

        float fallOff = 1.0;
        #if __VERSION__ >= 110
            // allow use of control flow
        if(lightColor.w > 1.0){
        #endif
            fallOff =  computeSpotFalloff(g_LightData[i+2], lightVec);
        #if __VERSION__ >= 110
        }
        #endif
        //point light attenuation
        fallOff *= lightDir.w;

        lightDir.xyz = normalize(lightDir.xyz);
        vec3 directDiffuse;
        vec3 directSpecular;

        float hdotv = PBR_ComputeDirectLight(normal, lightDir.xyz, viewDir,
                            lightColor.rgb, fZero, Roughness, ndotv,
                            directDiffuse,  directSpecular);

        vec3 directLighting = diffuseColor.rgb *directDiffuse + directSpecular;

        gl_FragColor.rgb += directLighting * fallOff;
    }

    #if NB_PROBES >= 1
        vec3 color1 = vec3(0.0);
        vec3 color2 = vec3(0.0);
        vec3 color3 = vec3(0.0);
        float weight1 = 1.0;
        float weight2 = 0.0;
        float weight3 = 0.0;

        float ndf = renderProbe(viewDir, wPosition, normal, norm, Roughness, diffuseColor, specularColor, ndotv, ao, g_LightProbeData, g_ShCoeffs, g_PrefEnvMap, color1);
        #if NB_PROBES >= 2
            float ndf2 = renderProbe(viewDir, wPosition, normal, norm, Roughness, diffuseColor, specularColor, ndotv, ao, g_LightProbeData2, g_ShCoeffs2, g_PrefEnvMap2, color2);
        #endif
        #if NB_PROBES == 3
            float ndf3 = renderProbe(viewDir, wPosition, normal, norm, Roughness, diffuseColor, specularColor, ndotv, ao, g_LightProbeData3, g_ShCoeffs3, g_PrefEnvMap3, color3);
        #endif

        #if NB_PROBES >= 2
            float invNdf =  max(1.0 - ndf,0.0);
            float invNdf2 =  max(1.0 - ndf2,0.0);
            float sumNdf = ndf + ndf2;
            float sumInvNdf = invNdf + invNdf2;
            #if NB_PROBES == 3
                float invNdf3 = max(1.0 - ndf3,0.0);
                sumNdf += ndf3;
                sumInvNdf += invNdf3;
                weight3 =  ((1.0 - (ndf3 / sumNdf)) / (NB_PROBES - 1)) *  (invNdf3 / sumInvNdf);
            #endif

            weight1 = ((1.0 - (ndf / sumNdf)) / (NB_PROBES - 1)) *  (invNdf / sumInvNdf);
            weight2 = ((1.0 - (ndf2 / sumNdf)) / (NB_PROBES - 1)) *  (invNdf2 / sumInvNdf);

            float weightSum = weight1 + weight2 + weight3;

            weight1 /= weightSum;
            weight2 /= weightSum;
            weight3 /= weightSum;
        #endif

        #if USE_AMBIENT_LIGHT
            color1.rgb *= g_AmbientLightColor.rgb;
            color2.rgb *= g_AmbientLightColor.rgb;
            color3.rgb *= g_AmbientLightColor.rgb;
        #endif
        gl_FragColor.rgb += color1 * clamp(weight1,0.0,1.0) + color2 * clamp(weight2,0.0,1.0) + color3 * clamp(weight3,0.0,1.0);

    #endif

    #if defined(EMISSIVE) || defined (EMISSIVEMAP)
        #ifdef EMISSIVEMAP
            vec4 xemissive = texture2DArray(m_EmissiveMap, vec3(texCoord.zy, vid));
            vec4 yemissive = texture2DArray(m_EmissiveMap, vec3(texCoord.xz, vid));
            vec4 zemissive = texture2DArray(m_EmissiveMap, vec3(texCoord.xy, vid));
            vec4 emissive = xemissive * blend.x
            + yemissive * blend.y
            + zemissive * blend.z;
        #else
            vec4 emissive = m_Emissive;
        #endif
        gl_FragColor += emissive * pow(emissive.a, m_EmissivePower) * m_EmissiveIntensity;
    #endif
    gl_FragColor.a = alpha;

}