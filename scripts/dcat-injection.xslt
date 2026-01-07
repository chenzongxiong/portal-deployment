<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet version="1.0"
                xmlns:xsl="http://www.w3.org/1999/XSL/Transform"
                xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#"
                xmlns:rdfs="http://www.w3.org/2000/01/rdf-schema#"
                xmlns:dcat="http://www.w3.org/ns/dcat#"
                xmlns:skos="http://www.w3.org/2004/02/skos/core#"
                xmlns:dct="http://purl.org/dc/terms/"
                exclude-result-prefixes="xsl">

  <xsl:output method="xml" indent="yes"/>

  <!-- External parameter -->
  <xsl:param name="categories" select="''"/>

  <!-- Identity transform -->
  <xsl:template match="@* | node()">
    <xsl:copy>
      <xsl:apply-templates select="@* | node()"/>
    </xsl:copy>
  </xsl:template>

  <!-- Match any element that is a dcat:Dataset -->
  <xsl:template match="*[rdf:type/@rdf:resource='http://www.w3.org/ns/dcat#Dataset']">
    <xsl:copy>
      <xsl:apply-templates select="@* | node()"/>
      <xsl:call-template name="inject-categories"/>
    </xsl:copy>
  </xsl:template>

  <!-- Match rdf:RDF and inject ConceptScheme and Concepts -->
  <xsl:template match="/rdf:RDF">
    <xsl:copy>
      <xsl:apply-templates select="@* | node()"/>

      <!-- Inject ConceptScheme -->
      <skos:ConceptScheme rdf:about="http://publications.europa.eu/resource/authority/data-theme">
        <dct:title>Data theme</dct:title>
      </skos:ConceptScheme>

      <!-- Inject Concepts for each category -->
      <xsl:call-template name="add-concepts"/>
    </xsl:copy>
  </xsl:template>

  <xsl:template name="inject-categories">
    <xsl:param name="categories" select="$categories"/>
    <xsl:variable name="cat" select="substring-before(concat($categories, ' '), ' ')"/>
    <xsl:if test="$cat">
      <dcat:theme rdf:resource="http://publications.europa.eu/resource/authority/data-theme/{$cat}"/>
      <xsl:variable name="rest" select="normalize-space(substring-after($categories, $cat))"/>
      <xsl:call-template name="inject-categories">
        <xsl:with-param name="categories" select="$rest"/>
      </xsl:call-template>
    </xsl:if>
  </xsl:template>

  <!-- Recursively inject skos:Concepts -->
  <xsl:template name="add-concepts">
    <xsl:param name="categories" select="$categories"/>
    <xsl:variable name="cat" select="substring-before(concat($categories, ' '), ' ')"/>
    <xsl:if test="$cat">
      <skos:Concept rdf:about="http://publications.europa.eu/resource/authority/data-theme/{$cat}">
        <skos:inScheme rdf:resource="http://publications.europa.eu/resource/authority/data-theme"/>
      </skos:Concept>
      <xsl:variable name="rest" select="normalize-space(substring-after($categories, $cat))"/>
      <xsl:call-template name="add-concepts">
        <xsl:with-param name="categories" select="$rest"/>
      </xsl:call-template>
    </xsl:if>
  </xsl:template>

  <!-- Template to transform dcat:mediaType elements -->
  <xsl:template match="dcat:mediaType">
    <xsl:variable name="mediaTypeFormat" select="normalize-space(.)"/>
    <xsl:choose>
      <xsl:when test="$mediaTypeFormat = 'application/pdf'">
        <dct:format>
          <rdf:Description rdf:about="http://publications.europa.eu/resource/authority/file-type/PDF">
            <rdf:type rdf:resource="http://purl.org/dc/terms/MediaTypeOrExtent"/>
          </rdf:Description>
        </dct:format>
      </xsl:when>
      <xsl:when test="$mediaTypeFormat = 'text/html'">
        <dct:format>
          <rdf:Description rdf:about="http://publications.europa.eu/resource/authority/file-type/HTML">
            <rdf:type rdf:resource="http://purl.org/dc/terms/MediaTypeOrExtent"/>
          </rdf:Description>
        </dct:format>
      </xsl:when>
      <xsl:when test="$mediaTypeFormat = 'text/csv'">
        <dct:format>
          <rdf:Description rdf:about="http://publications.europa.eu/resource/authority/file-type/CSV">
            <rdf:type rdf:resource="http://purl.org/dc/terms/MediaTypeOrExtent"/>
          </rdf:Description>
        </dct:format>
      </xsl:when>
      <xsl:when test="$mediaTypeFormat = 'application/zip'">
        <dct:format>
          <rdf:Description rdf:about="http://publications.europa.eu/resource/authority/file-type/ZIP">
            <rdf:type rdf:resource="http://purl.org/dc/terms/MediaTypeOrExtent"/>
          </rdf:Description>
        </dct:format>
      </xsl:when>
      <xsl:when test="$mediaTypeFormat = 'video/mp4'">
        <dct:format>
          <rdf:Description rdf:about="http://publications.europa.eu/resource/authority/file-type/MPEG4">
            <rdf:type rdf:resource="http://purl.org/dc/terms/MediaTypeOrExtent"/>
          </rdf:Description>
        </dct:format>
      </xsl:when>

      <!-- <xsl:when test="$mediaTypeFormat = 'text/x-vcard'"> -->
      <!--   <dct:format> -->
      <!--     <rdf:Description rdf:about="http://publications.europa.eu/resource/authority/file-type/MPEG4"> -->
      <!--       <rdf:type rdf:resource="http://purl.org/dc/terms/MediaTypeOrExtent"/> -->
      <!--     </rdf:Description> -->
      <!--   </dct:format> -->
      <!-- </xsl:when> -->

      <xsl:otherwise>
        <!-- If not matched, copy the original dcat:mediaType -->
        <xsl:copy>
          <xsl:apply-templates select="@* | node()"/>
        </xsl:copy>
      </xsl:otherwise>
    </xsl:choose>
  </xsl:template>

  <!-- Match the Distribution node -->
  <!-- <xsl:template match="rdf:Description[dcat:byteSize]"> -->
  <!--   <xsl:variable name="distURI" select="@rdf:about"/> -->

  <!--   <!-\- Find corresponding Dataset -\-> -->
  <!--   <xsl:variable name="dataset" select="//rdf:Description[dcat:distribution/@rdf:resource = $distURI]"/> -->

  <!--   <xsl:variable name="issued" select="$dataset/dct:issued[1]"/> -->
  <!--   <xsl:variable name="modified" select="$dataset/dct:modified[1]"/> -->

  <!--   <xsl:copy> -->
  <!--     <xsl:apply-templates select="@*|node()"/> -->

  <!--     <!-\- Inject issued if missing -\-> -->
  <!--     <xsl:if test="not(dct:issued) and $issued"> -->
  <!--       <xsl:copy-of select="$issued"/> -->
  <!--     </xsl:if> -->

  <!--     <!-\- Inject modified if missing -\-> -->
  <!--     <xsl:if test="not(dct:modified) and $modified"> -->
  <!--       <xsl:copy-of select="$modified"/> -->
  <!--     </xsl:if> -->
  <!--   </xsl:copy> -->
  <!-- </xsl:template> -->

</xsl:stylesheet>
